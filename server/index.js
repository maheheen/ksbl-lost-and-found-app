// Starts the API server:  npm start   (or npm run dev to auto-restart on changes)
const { openDb } = require("./db");
const { createApp } = require("./app");

const PORT = process.env.PORT || 3001;
const db = openDb();
const app = createApp(db);

app.listen(PORT, () => {
  const count = db.prepare("SELECT COUNT(*) AS n FROM items").get().n;
  console.log(`KSBL Lost & Found API running at http://localhost:${PORT}  (${count} items in database)`);
  if (count === 0) console.log("Tip: run `npm run seed` to add sample campus items.");
});
