// Entry point for the API.
//   Locally:   npm start   (or npm run dev to auto-restart on changes)  -> listens on :3001
//   On Vercel: the platform imports this file and uses the exported Express app, so we must
//              NOT start our own listener there. (Vercel finds an Express entry by the
//              "express" import, hence the line below, and vercel.json names this file too.)
const express = require("express"); // eslint-disable-line no-unused-vars
const { openDb } = require("./db");
const { createApp } = require("./app");

const dbPromise = openDb(); // local file by default, hosted Turso when TURSO_DATABASE_URL is set
// Log a connection problem once, clearly. Requests also fail with a 500 until it is fixed.
dbPromise.catch((err) => console.error("Could not open the database:", err.message));

const app = createApp(dbPromise);

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, async () => {
    try {
      const db = await dbPromise;
      const { n } = await db.get("SELECT COUNT(*) AS n FROM items");
      console.log(`KSBL Lost & Found API running at http://localhost:${PORT}  (${n} items, ${db.kind} database)`);
      if (n === 0) console.log("Tip: run `npm run seed` to add sample campus items.");
    } catch {
      console.log(`API listening on http://localhost:${PORT}, but the database is not available (see error above).`);
    }
  });
}

module.exports = app;
