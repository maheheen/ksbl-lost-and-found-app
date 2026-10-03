// SQLite setup. The database is a single file (server/lostfound.db) so data
// survives restarts. The table is created automatically the first time we run.
const path = require("path");
const Database = require("better-sqlite3");
const { TYPES, CATEGORIES, LOCATIONS, LEGACY_LOCATIONS, STATUSES } = require("./constants");

const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(__dirname, "lostfound.db");

// Turns ["a","b"] into the SQL text 'a','b' for CHECK constraints.
// Safe because the lists above are constants in our own code, not user input.
const sqlList = (list) => list.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

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
  );
  CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(type, status);
`;

/**
 * Databases created before the campus place list existed have the OLD places baked into their
 * CHECK constraint, and SQLite cannot edit a constraint in place. So: if the saved table does
 * not accept every current place, rebuild it and move the rows across, translating old places
 * (e.g. "Sports Area" -> "Gym"). Runs once; later starts see an up-to-date table and skip this.
 */
function migrateLocationsIfNeeded(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items'").get();
  if (!row || LOCATIONS.every((l) => row.sql.includes(`'${l}'`))) return;

  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    db.exec("ALTER TABLE items RENAME TO items_old; DROP INDEX IF EXISTS idx_items_type_status;");
    db.exec(CREATE_TABLE);
    const insert = db.prepare(`
      INSERT INTO items (id, type, title, description, category, location, date, status, matched_with)
      VALUES (@id, @type, @title, @description, @category, @location, @date, @status, @matched_with)`);
    // Copy the rows first WITHOUT pair links (a pair points at a row that may not exist yet),
    // then restore the links once every row is in place.
    const oldRows = db.prepare("SELECT * FROM items_old").all();
    for (const old of oldRows) {
      const location = LOCATIONS.includes(old.location) ? old.location : LEGACY_LOCATIONS[old.location] || "Other";
      insert.run({ ...old, location, matched_with: null });
    }
    const relink = db.prepare("UPDATE items SET matched_with = ? WHERE id = ?");
    for (const old of oldRows) if (old.matched_with) relink.run(old.matched_with, old.id);
    db.exec("DROP TABLE items_old");
  })();
  db.pragma("foreign_keys = ON");
}

function openDb(file = DEFAULT_DB_PATH) {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // The CHECK constraints are a second line of defence behind the API validation.
  // matched_with links a confirmed Lost/Found pair (it is NULL until a match is confirmed).
  db.exec(CREATE_TABLE);
  migrateLocationsIfNeeded(db);

  return db;
}

module.exports = { openDb };
