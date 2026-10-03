// Checks that a database created before the KSBL place list existed is upgraded safely:
// rows are kept (ids, status and pair links included) and old places are translated.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");
const { openDb } = require("./db");
const { LOCATIONS, LOCATION_GROUPS } = require("./constants");

test("the place list has every KSBL place exactly once, plus Other", () => {
  assert.equal(new Set(LOCATIONS).size, LOCATIONS.length);
  assert.equal(LOCATIONS.at(-1), "Other");
  for (const place of [
    "Reception", "Cafeteria", "Garden", "Parking", "Campus Activity Center (CAC)",
    "Lecture Hall 1", "Lecture Hall 2", "Lecture Hall 3", "Seminar Hall 1", "Seminar Hall 2", "Seminar Hall 3",
    "Gym", "Computer Lab", "Hardware Lab", "Library", "Courtyard",
    "Prayer Room (Male)", "Prayer Room (Female)",
    "Washroom 1 (Male)", "Washroom 2 (Male)", "Washroom 1 (Female)", "Washroom 2 (Female)",
  ]) {
    assert.ok(LOCATIONS.includes(place), `${place} should be a place`);
  }
  assert.equal(LOCATIONS.length, 23);
  assert.ok(LOCATION_GROUPS.every((g) => g.label && g.items.length > 0));
});

test("an old-schema database is migrated without losing data", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ksbl-")), "old.db");

  // Build a database exactly as the first version of the app did.
  const old = new Database(file);
  old.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('Lost','Found')),
      title TEXT NOT NULL, description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL CHECK (location IN ('Library','Cafeteria','Main Hall','Classroom Block A','Classroom Block B','Computer Lab','Parking Area','Sports Area','Admin Office','Other')),
      date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Open',
      matched_with INTEGER REFERENCES items(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_items_type_status ON items(type, status);`);
  const ins = old.prepare("INSERT INTO items (type,title,description,category,location,date,status,matched_with) VALUES (?,?,?,?,?,?,?,?)");
  ins.run("Lost", "Grey hoodie", "Plain", "Clothing", "Sports Area", "2026-03-10", "Matched", null);
  ins.run("Found", "Hoodie found", "Plain", "Clothing", "Sports Area", "2026-03-11", "Matched", null);
  old.exec("UPDATE items SET matched_with = 2 WHERE id = 1; UPDATE items SET matched_with = 1 WHERE id = 2;");
  ins.run("Lost", "Umbrella", "Black", "Accessories", "Classroom Block B", "2026-03-01", "Open", null);
  ins.run("Lost", "Keys", "Silver", "Keys", "Library", "2026-03-02", "Open", null);
  old.close();

  const db = openDb(file); // runs the migration
  const rows = db.prepare("SELECT * FROM items ORDER BY id").all();
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.location), ["Gym", "Gym", "Lecture Hall 2", "Library"]);
  assert.deepEqual(rows.map((r) => r.id), [1, 2, 3, 4]); // ids kept
  assert.deepEqual([rows[0].status, rows[0].matched_with, rows[1].matched_with], ["Matched", 2, 1]); // pair kept

  // The new places are now accepted, and the table keeps working normally.
  db.prepare("INSERT INTO items (type,title,description,category,location,date) VALUES ('Found','Prayer mat','Green','Other','Prayer Room (Female)','2026-03-12')").run();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM items").get().n, 5);
  assert.throws(() => db.prepare("INSERT INTO items (type,title,description,category,location,date) VALUES ('Lost','Bad','x','Other','Atlantis','2026-03-12')").run());

  // Opening it again does nothing (already up to date).
  db.close();
  const again = openDb(file);
  assert.equal(again.prepare("SELECT COUNT(*) AS n FROM items").get().n, 5);
  again.close();
});
