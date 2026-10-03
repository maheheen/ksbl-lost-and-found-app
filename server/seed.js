// Fills the database with realistic sample campus items:  npm run seed
// WARNING: this clears the items table first, so run it on a fresh/demo database.
//
// Dates are written as "days ago" so the demo always looks recent. What the data shows:
//   - Lost "calculator", "keys", "backpack" and "ID card" each have 1-2 possible matches
//   - Lost "hoodie" has NO possible match (nothing found at the Gym)
//   - the "wallet" pair is already Matched, the "umbrella" pair is Returned
const { openDb } = require("./db");

/** YYYY-MM-DD for "n days ago" in local time. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const ITEMS = [
  // ---- Lost items ----
  { key: "calc", type: "Lost", title: "Blue Casio scientific calculator", category: "Electronics", location: "Library", ago: 5,
    description: "Casio fx-991 in a blue hard case with my initials scratched on the back. Left it on a desk on the second floor." },
  { key: "keys", type: "Lost", title: "Silver house keys with red tag", category: "Keys", location: "Cafeteria", ago: 4,
    description: "Three keys on a ring with a red plastic tag and a small bottle opener. Probably dropped near the juice counter." },
  { key: "bag", type: "Lost", title: "Navy blue backpack", category: "Bags", location: "Computer Lab", ago: 3,
    description: "Navy Wildcraft backpack with a laptop sleeve and two notebooks inside. Has a yellow keychain on the zip." },
  { key: "id", type: "Lost", title: "Student ID card on green lanyard", category: "ID Cards", location: "Reception", ago: 6,
    description: "KSBL student ID card in a clear holder with a green lanyard. Lost while submitting forms at the reception counter." },
  { key: "hoodie", type: "Lost", title: "Grey zip-up hoodie", category: "Clothing", location: "Gym", ago: 8,
    description: "Plain grey hoodie, size L, with a small tear on the left cuff. Left on the bench near the weights area." },
  { key: "wallet-lost", type: "Lost", title: "Brown leather wallet", category: "Wallets & Money", location: "Parking", ago: 7, status: "Matched",
    description: "Brown leather wallet with a bus pass and some cash. Fell out of my pocket near the motorbike stand." },
  { key: "umbrella-lost", type: "Lost", title: "Black folding umbrella", category: "Accessories", location: "Lecture Hall 2", ago: 13, status: "Returned",
    description: "Black umbrella with a wooden handle. Forgot it outside Lecture Hall 2 after the rain." },

  // ---- Found items ----
  { key: "calc-found", type: "Found", title: "Calculator left on a desk", category: "Electronics", location: "Library", ago: 4,
    description: "Blue scientific calculator in a hard case found on the second-floor study desks. Handed to the library desk." },
  { key: "calc-found-2", type: "Found", title: "Black Casio calculator", category: "Electronics", location: "Library", ago: 7,
    description: "Black calculator found under a chair in the reading hall. Slightly scratched, no case." },
  { key: "keys-found", type: "Found", title: "Keys with a red keychain", category: "Keys", location: "Cafeteria", ago: 3,
    description: "Small bunch of keys with a red tag found on a table near the juice counter." },
  { key: "bag-found", type: "Found", title: "Dark backpack with laptop sleeve", category: "Bags", location: "Computer Lab", ago: 5,
    description: "Dark blue backpack found beside workstation 14. Contains notebooks. Kept with the lab assistant." },
  { key: "id-found", type: "Found", title: "Student card with green lanyard", category: "ID Cards", location: "Reception", ago: 6,
    description: "Student ID card found on the floor by the reception counter. Handed in at the desk." },
  { key: "wallet-found", type: "Found", title: "Brown wallet near motorbike stand", category: "Wallets & Money", location: "Parking", ago: 6, status: "Matched",
    description: "Brown leather wallet found next to the motorbike stand. Handed to the security guard." },
  { key: "umbrella-found", type: "Found", title: "Black umbrella outside Lecture Hall 2", category: "Accessories", location: "Lecture Hall 2", ago: 12, status: "Returned",
    description: "Black folding umbrella with a wooden handle, left outside the lecture hall door." },
];

// Pairs that are already linked (Matched / Returned). [lostKey, foundKey]
const PAIRS = [
  ["wallet-lost", "wallet-found"],
  ["umbrella-lost", "umbrella-found"],
];

const db = openDb();
const insert = db.prepare(`
  INSERT INTO items (type, title, description, category, location, date, status)
  VALUES (@type, @title, @description, @category, @location, @date, @status)`);
const link = db.prepare("UPDATE items SET matched_with = ? WHERE id = ?");

db.transaction(() => {
  db.exec("DELETE FROM items; DELETE FROM sqlite_sequence WHERE name = 'items';");
  const ids = {};
  for (const it of ITEMS) {
    ids[it.key] = insert.run({
      type: it.type,
      title: it.title,
      description: it.description,
      category: it.category,
      location: it.location,
      date: daysAgo(it.ago),
      status: it.status || "Open",
    }).lastInsertRowid;
  }
  for (const [a, b] of PAIRS) {
    link.run(ids[b], ids[a]);
    link.run(ids[a], ids[b]);
  }
})();

console.log(`Seeded ${ITEMS.length} items into the database.`);
