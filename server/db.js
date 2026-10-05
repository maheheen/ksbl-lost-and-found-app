// SQLite setup, through the libSQL client (https://docs.turso.tech/sdk/ts).
// libSQL is SQLite: the same SQL, the same file format. It can open
//   - a local file  (default: server/lostfound.db, created on first run - nothing to install), or
//   - a hosted Turso database (set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN) - needed on Vercel,
//     because serverless functions cannot keep a database file between requests.
// The items table is created automatically the first time we connect.
const path = require("path");
const { pathToFileURL } = require("url");
const { createClient } = require("@libsql/client");
const { TYPES, CATEGORIES, LOCATIONS, LEGACY_LOCATIONS, STATUSES } = require("./constants");

const DEFAULT_DB_FILE = process.env.DB_PATH || path.join(__dirname, "lostfound.db");

// Turns ["a","b"] into the SQL text 'a','b' for CHECK constraints.
// Safe because the lists above are constants in our own code, not user input.
const sqlList = (list) => list.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

// The CHECK constraints are a second line of defence behind the API validation.
// matched_with links a confirmed Lost/Found pair (it is NULL until a match is confirmed).
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT NOT NULL CHECK (type IN (${sqlList(TYPES)})),
    title        TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 100),
    description  TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 500),
    category     TEXT NOT NULL CHECK (category IN (${sqlList(CATEGORIES)})),
    location     TEXT NOT NULL CHECK (location IN (${sqlList(LOCATIONS)})),
    date         TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    status       TEXT NOT NULL DEFAULT 'Open' CHECK (status IN (${sqlList(STATUSES)})),
    matched_with INTEGER REFERENCES items(id) ON DELETE SET NULL
  )`;
const CREATE_INDEX = "CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(type, status)";

const INSERT_ITEM_SQL = `
  INSERT INTO items (id, type, title, description, category, location, date, status, matched_with)
  VALUES (@id, @type, @title, @description, @category, @location, @date, @status, @matched_with)`;

/** Turns a libSQL result row into a plain object ({ id: 1, title: "..." }). */
const toPlain = (columns) => (row) => Object.fromEntries(columns.map((c, i) => [c, row[i]]));

/**
 * Small helper API over a libSQL client or an open transaction, so the routes read simply:
 *   await db.all(sql, args)  -> array of row objects
 *   await db.get(sql, args)  -> first row object, or undefined
 *   await db.run(sql, args)  -> { changes, lastInsertRowid }
 * `args` is an array (for ?) or an object (for @name). Always parameterized - user input never
 * becomes part of the SQL text.
 */
function wrap(executor) {
  const all = async (sql, args = []) => {
    const result = await executor.execute({ sql, args });
    return result.rows.map(toPlain(result.columns));
  };
  return {
    all,
    get: async (sql, args = []) => (await all(sql, args))[0],
    run: async (sql, args = []) => {
      const result = await executor.execute({ sql, args });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid == null ? null : Number(result.lastInsertRowid),
      };
    },
  };
}

/**
 * Databases created before the campus place list existed have the OLD places baked into their
 * CHECK constraint, and SQLite cannot edit a constraint in place. So: if the saved table does
 * not accept every current place, rebuild it and move the rows across, translating old places
 * (e.g. "Sports Area" -> "Gym"). Everything happens in ONE transaction. Runs once; later starts
 * see an up-to-date table and skip this.
 */
async function migrateLocationsIfNeeded(db, client) {
  const row = await db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items'");
  if (!row || LOCATIONS.every((l) => row.sql.includes(`'${l}'`))) return;

  const oldRows = await db.all("SELECT * FROM items");
  const statements = [
    "ALTER TABLE items RENAME TO items_old",
    "DROP INDEX IF EXISTS idx_items_type_status",
    CREATE_TABLE,
    CREATE_INDEX,
  ];
  // Copy the rows first WITHOUT pair links (a pair points at a row that may not exist yet),
  // then restore the links once every row is in place.
  for (const old of oldRows) {
    const location = LOCATIONS.includes(old.location) ? old.location : LEGACY_LOCATIONS[old.location] || "Other";
    statements.push({ sql: INSERT_ITEM_SQL, args: { ...old, location, matched_with: null } });
  }
  for (const old of oldRows) {
    if (old.matched_with) {
      statements.push({ sql: "UPDATE items SET matched_with = ? WHERE id = ?", args: [old.matched_with, old.id] });
    }
  }
  statements.push("DROP TABLE items_old");
  await client.batch(statements, "write");
}

/**
 * Connects and makes sure the table exists. Returns a Promise of the db helper.
 *   openDb()              -> TURSO_DATABASE_URL if set, otherwise the local file server/lostfound.db
 *   openDb("/path/x.db")  -> that local file (used by the tests and the DB_PATH setting)
 *   openDb({ url, authToken }) -> any libSQL URL
 */
async function openDb(target) {
  let config;
  if (typeof target === "string") config = { url: pathToFileURL(target).href };
  else if (target && target.url) config = target;
  else if (process.env.TURSO_DATABASE_URL) {
    config = { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  } else config = { url: pathToFileURL(DEFAULT_DB_FILE).href };

  const client = createClient(config);
  const db = wrap(client);

  await client.batch([CREATE_TABLE, CREATE_INDEX], "write");
  await migrateLocationsIfNeeded(db, client);

  return {
    ...db,
    /** "hosted" for Turso, "local" for a file - shown by GET /api/health */
    kind: /^(libsql|https?|wss?):/.test(config.url) ? "hosted" : "local",
    /** Runs fn(tx) inside one transaction: all of its writes happen, or none do. */
    async transaction(fn) {
      const tx = await client.transaction("write");
      try {
        const result = await fn(wrap(tx));
        await tx.commit();
        return result;
      } catch (err) {
        try {
          await tx.rollback();
        } catch {
          /* already rolled back */
        }
        throw err;
      } finally {
        tx.close();
      }
    },
    close: () => client.close(),
  };
}

module.exports = { openDb };
