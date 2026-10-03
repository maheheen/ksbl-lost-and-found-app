// The Express app: every REST route lives here. createApp(db) is separate from
// index.js so the automated API tests can run it against an in-memory database.
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { TYPES, CATEGORIES, LOCATIONS, STATUSES } = require("./constants");
const { validateItem, isValidISODate } = require("./validation");
const { MATCH_RULES, evaluateMatch, findMatches } = require("./matching");

// Database rows use snake_case (matched_with); the JSON API uses camelCase (matchedWith).
const toItem = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  description: row.description,
  category: row.category,
  location: row.location,
  date: row.date,
  status: row.status,
  matchedWith: row.matched_with,
});

// Small helper for sending JSON errors in the shape { "error": "..." }.
// `errors` (optional) maps field names to messages so the form can show them next to each input.
const fail = (res, status, message, errors) =>
  res.status(status).json(errors ? { error: message, errors } : { error: message });

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  // ---- Prepared statements (always parameterized - user input never touches the SQL text) ----
  const getById = db.prepare("SELECT * FROM items WHERE id = ?");
  const getAll = db.prepare("SELECT * FROM items");
  const insertItem = db.prepare(`
    INSERT INTO items (type, title, description, category, location, date, status)
    VALUES (@type, @title, @description, @category, @location, @date, @status)`);
  const updateItem = db.prepare(`
    UPDATE items SET type=@type, title=@title, description=@description, category=@category,
                     location=@location, date=@date, status=@status, matched_with=@matchedWith
    WHERE id=@id`);
  const setStatusAndLink = db.prepare("UPDATE items SET status = ?, matched_with = ? WHERE id = ?");
  const deleteItem = db.prepare("DELETE FROM items WHERE id = ?");

  /** Parses ":id" from the URL. Returns null if it is not a positive whole number. */
  const parseId = (value) => (/^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : null);

  /**
   * If `row` is paired with another item, put the partner back to "Open" and
   * clear its link. Used when a pair is broken (item edited, un-matched or deleted).
   * Partners that are already "Returned" keep their status.
   */
  const releasePartner = (row) => {
    if (!row.matched_with) return;
    const partner = getById.get(row.matched_with);
    if (!partner) return;
    const newStatus = partner.status === "Matched" ? "Open" : partner.status;
    setStatusAndLink.run(newStatus, null, partner.id);
  };

  // --------------------------------------------------------------------------
  // GET /api/items
  // List items, newest date first. Optional query filters (all combinable):
  //   type, category, location, status  - exact match against the allowed lists
  //   search                            - case-insensitive text in title OR description
  //   dateFrom, dateTo                  - YYYY-MM-DD, inclusive range on the item date
  // --------------------------------------------------------------------------
  app.get("/api/items", (req, res) => {
    const { type, category, location, status, search, dateFrom, dateTo } = req.query;
    const where = [];
    const params = [];

    // Each exact-match filter is checked against its allowed list, then added as "column = ?".
    const exact = [
      ["type", type, TYPES],
      ["category", category, CATEGORIES],
      ["location", location, LOCATIONS],
      ["status", status, STATUSES],
    ];
    for (const [column, value, allowed] of exact) {
      if (value === undefined || value === "") continue;
      if (typeof value !== "string" || !allowed.includes(value)) {
        return fail(res, 400, `Unknown ${column} filter: "${value}"`);
      }
      where.push(`${column} = ?`);
      params.push(value);
    }

    if (typeof search === "string" && search.trim()) {
      // Escape % and _ so they are searched literally, then wrap in % for "contains".
      const like = `%${search.trim().toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
      where.push("(LOWER(title) LIKE ? ESCAPE '\\' OR LOWER(description) LIKE ? ESCAPE '\\')");
      params.push(like, like);
    }

    for (const [name, value, op] of [["dateFrom", dateFrom, ">="], ["dateTo", dateTo, "<="]]) {
      if (value === undefined || value === "") continue;
      if (!isValidISODate(value)) return fail(res, 400, `${name} must be a real date in YYYY-MM-DD format`);
      where.push(`date ${op} ?`);
      params.push(value);
    }

    const sql = `SELECT * FROM items ${where.length ? "WHERE " + where.join(" AND ") : ""}
                 ORDER BY date DESC, id DESC`;
    res.json(db.prepare(sql).all(...params).map(toItem));
  });

  // --------------------------------------------------------------------------
  // GET /api/matches
  // Overview for the Matches page: every Lost item that has at least one possible
  // match, or that is already paired. Result shape:
  //   [{ lost, matches: [{ item, daysApart, reasons, conditions }], partner }]
  // (Registered before /api/items/:id so the two never clash.)
  // --------------------------------------------------------------------------
  app.get("/api/matches", (req, res) => {
    const all = getAll.all().map(toItem);
    const byId = new Map(all.map((i) => [i.id, i]));
    const groups = [];
    for (const lost of all) {
      if (lost.type !== "Lost") continue;
      const matches = findMatches(lost, all); // rules live in matching.js
      const partner = lost.matchedWith ? byId.get(lost.matchedWith) || null : null;
      if (matches.length || partner) groups.push({ lost, matches, partner });
    }
    groups.sort((a, b) => (a.lost.date < b.lost.date ? 1 : -1));
    res.json({ rules: MATCH_RULES, groups });
  });

  // --------------------------------------------------------------------------
  // GET /api/items/:id  - one item, or 404.
  // --------------------------------------------------------------------------
  app.get("/api/items/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, "Item id must be a positive whole number");
    const row = getById.get(id);
    if (!row) return fail(res, 404, "Item not found");
    res.json(toItem(row));
  });

  // --------------------------------------------------------------------------
  // POST /api/items  - create an item. Validates every field; status defaults to "Open".
  // --------------------------------------------------------------------------
  app.post("/api/items", (req, res) => {
    const { errors, value } = validateItem(req.body, { isCreate: true });
    const first = Object.values(errors)[0];
    if (first) return fail(res, 400, first, errors);
    const info = insertItem.run(value);
    res.status(201).json(toItem(getById.get(info.lastInsertRowid)));
  });

  // --------------------------------------------------------------------------
  // PUT /api/items/:id  - replace all editable fields of an item.
  // If the item was paired and the edit breaks the pair (status back to "Open", or the
  // type/category/location/date changed) the partner is released back to "Open" too.
  // --------------------------------------------------------------------------
  app.put("/api/items/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, "Item id must be a positive whole number");
    const existing = getById.get(id);
    if (!existing) return fail(res, 404, "Item not found");

    const { errors, value } = validateItem(req.body, { isCreate: false });
    const first = Object.values(errors)[0];
    if (first) return fail(res, 400, first, errors);

    const save = db.transaction(() => {
      let matchedWith = existing.matched_with;
      const matchFieldsChanged = ["type", "category", "location", "date"].some((k) => value[k] !== existing[k]);
      if (matchedWith && existing.status !== "Returned" && (value.status === "Open" || matchFieldsChanged)) {
        releasePartner(existing);
        matchedWith = null;
        if (value.status === "Matched") value.status = "Open"; // a broken pair cannot stay "Matched"
      }
      updateItem.run({ ...value, id, matchedWith });
    });
    save();
    res.json(toItem(getById.get(id)));
  });

  // --------------------------------------------------------------------------
  // DELETE /api/items/:id  - delete an item. A paired partner goes back to "Open".
  // --------------------------------------------------------------------------
  app.delete("/api/items/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, "Item id must be a positive whole number");
    const existing = getById.get(id);
    if (!existing) return fail(res, 404, "Item not found");

    db.transaction(() => {
      if (existing.status !== "Returned") releasePartner(existing);
      deleteItem.run(id);
    })();
    res.json({ message: "Item deleted", id });
  });

  // --------------------------------------------------------------------------
  // GET /api/items/:id/matches
  // Possible Found items for a LOST item (rules and sorting are in matching.js).
  // Calling it on a Found item is a 400. Response:
  //   { item, rules, matches: [{ item, daysApart, reasons, conditions }] }
  // --------------------------------------------------------------------------
  app.get("/api/items/:id/matches", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, "Item id must be a positive whole number");
    const row = getById.get(id);
    if (!row) return fail(res, 404, "Item not found");
    if (row.type !== "Lost") {
      return fail(res, 400, "Matches can only be requested for a Lost item. Open the matching Lost report instead.");
    }
    const lost = toItem(row);
    const matches = findMatches(lost, getAll.all().map(toItem));
    res.json({ item: lost, rules: MATCH_RULES, matches });
  });

  // --------------------------------------------------------------------------
  // POST /api/items/:id/confirm-match   body: { "foundId": 7 }
  // Pairs a Lost item (:id) with a Found item. Both must be "Open" and must really be a
  // possible match under the current rules. Both become "Matched" and point at each other.
  // --------------------------------------------------------------------------
  app.post("/api/items/:id/confirm-match", (req, res) => {
    const lostId = parseId(req.params.id);
    if (!lostId) return fail(res, 400, "Item id must be a positive whole number");
    const foundId = parseId(req.body && req.body.foundId);
    if (!foundId) return fail(res, 400, "foundId is required and must be a positive whole number");

    const lostRow = getById.get(lostId);
    const foundRow = getById.get(foundId);
    if (!lostRow) return fail(res, 404, "Lost item not found");
    if (!foundRow) return fail(res, 404, "Found item not found");
    if (lostRow.type !== "Lost") return fail(res, 400, "The item you are matching must be a Lost report");
    if (foundRow.type !== "Found") return fail(res, 400, "foundId must be a Found report");
    if (lostRow.status !== "Open") return fail(res, 409, `This lost report is already ${lostRow.status}`);
    if (foundRow.status !== "Open") return fail(res, 409, `That found item is already ${foundRow.status}`);
    if (!evaluateMatch(toItem(lostRow), toItem(foundRow))) {
      return fail(res, 400, "These two items are not a possible match");
    }

    db.transaction(() => {
      setStatusAndLink.run("Matched", foundId, lostId);
      setStatusAndLink.run("Matched", lostId, foundId);
    })();
    res.json({ lost: toItem(getById.get(lostId)), found: toItem(getById.get(foundId)) });
  });

  // --------------------------------------------------------------------------
  // POST /api/items/:id/mark-returned
  // The owner has their item back. Only "Matched" items can be returned.
  // The item and its partner (if any) both become "Returned".
  // --------------------------------------------------------------------------
  app.post("/api/items/:id/mark-returned", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, "Item id must be a positive whole number");
    const row = getById.get(id);
    if (!row) return fail(res, 404, "Item not found");
    if (row.status !== "Matched") return fail(res, 409, "Only matched items can be marked as returned");

    db.transaction(() => {
      setStatusAndLink.run("Returned", row.matched_with, id);
      if (row.matched_with && getById.get(row.matched_with)) {
        setStatusAndLink.run("Returned", id, row.matched_with);
      }
    })();
    res.json({
      item: toItem(getById.get(id)),
      partner: row.matched_with ? toItem(getById.get(row.matched_with)) : null,
    });
  });

  // ---- Optional: serve the built React app (after `npm run build` in /client) ----
  const dist = path.join(__dirname, "..", "client", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  // Unknown /api routes -> JSON 404 instead of an HTML error page.
  app.use("/api", (req, res) => fail(res, 404, "Route not found"));

  // Last-resort error handler: bad JSON is the client's fault (400), anything else is ours (500).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return fail(res, 400, "Request body is not valid JSON");
    if (err.type === "entity.too.large") return fail(res, 400, "Request body is too large");
    console.error(err);
    fail(res, 500, "Something went wrong on the server");
  });

  return app;
}

module.exports = { createApp };
