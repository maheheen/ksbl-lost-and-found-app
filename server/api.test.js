// End-to-end tests for the REST API, run against an in-memory database (your real data is untouched).
// They read the gap from MATCH_RULES, so they keep passing if you change maxDaysApart.
const test = require("node:test");
const assert = require("node:assert/strict");
const { openDb } = require("./db");
const { createApp } = require("./app");
const { MATCH_RULES } = require("./matching");
const { todayISO } = require("./validation");

let server, base;

test.before(async () => {
  const app = createApp(openDb(":memory:"));
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

// ---- helpers ----
const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const base_item = (over = {}) => ({
  type: "Lost",
  title: "Silver keys",
  description: "Three keys on a ring",
  category: "Keys",
  location: "Library",
  date: dayOffset(2),
  ...over,
});

test("POST creates an item (201) and defaults status to Open", async () => {
  const r = await call("POST", "/api/items", base_item());
  assert.equal(r.status, 201);
  assert.equal(r.body.status, "Open");
  assert.equal(r.body.matchedWith, null);
  assert.ok(r.body.id > 0);
});

test("POST validation: every rule returns 400 with { error }", async () => {
  const bad = [
    [{ type: "Missing" }, "Type"],
    [{ title: "  " }, "Title is required"],
    [{ title: "ab" }, "at least 3"],
    [{ title: "x".repeat(101) }, "100 characters"],
    [{ description: "" }, "Description is required"],
    [{ description: "x".repeat(501) }, "500 characters"],
    [{ category: "Pets" }, "Category"],
    [{ location: "Moon" }, "Location"],
    [{ date: "" }, "Date is required"],
    [{ date: "10/03/2026" }, "YYYY-MM-DD"],
    [{ date: "2026-02-31" }, "real date"],
    [{ date: "2999-01-01" }, "future"],
    [{ status: "Lost" }, "Status"],
  ];
  for (const [over, fragment] of bad) {
    const r = await call("POST", "/api/items", base_item(over));
    assert.equal(r.status, 400, JSON.stringify(over));
    assert.ok(r.body.error.includes(fragment), `${JSON.stringify(over)} -> ${r.body.error}`);
  }
  // today is allowed, a non-object body is rejected
  assert.equal((await call("POST", "/api/items", base_item({ date: todayISO() }))).status, 201);
  assert.equal((await call("POST", "/api/items", [1, 2])).status, 400);
});

test("malformed JSON gives 400", async () => {
  const res = await fetch(base + "/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  assert.equal(res.status, 400);
});

test("GET one item, 404 for unknown id, 400 for a bad id", async () => {
  const created = (await call("POST", "/api/items", base_item({ title: "Findable thing" }))).body;
  const ok = await call("GET", `/api/items/${created.id}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.title, "Findable thing");
  assert.equal((await call("GET", "/api/items/999999")).status, 404);
  assert.equal((await call("GET", "/api/items/abc")).status, 400);
  assert.equal((await call("GET", "/api/nope")).status, 404);
});

test("PUT updates an item; validates; 404 for unknown", async () => {
  const created = (await call("POST", "/api/items", base_item())).body;
  const upd = await call("PUT", `/api/items/${created.id}`, { ...created, title: "Updated title", status: "Open" });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.title, "Updated title");
  assert.equal((await call("PUT", `/api/items/${created.id}`, { ...created, title: "" })).status, 400);
  assert.equal((await call("PUT", "/api/items/999999", base_item({ status: "Open" }))).status, 404);
});

test("DELETE removes an item; second delete is 404", async () => {
  const created = (await call("POST", "/api/items", base_item())).body;
  assert.equal((await call("DELETE", `/api/items/${created.id}`)).status, 200);
  assert.equal((await call("GET", `/api/items/${created.id}`)).status, 404);
  assert.equal((await call("DELETE", `/api/items/${created.id}`)).status, 404);
});

test("GET /api/items filters: type, category, location, status, search, dates", async () => {
  await call("POST", "/api/items", base_item({ title: "Zebra pencil case", description: "Striped 100% cotton_x", category: "Books & Stationery", location: "Lecture Hall 1", date: "2026-01-05" }));
  await call("POST", "/api/items", base_item({ type: "Found", title: "Quokka umbrella", description: "Red", category: "Accessories", location: "Cafeteria", date: "2026-01-20" }));

  const q = async (qs) => (await call("GET", `/api/items?${qs}`)).body;
  assert.ok((await q("type=Found")).every((i) => i.type === "Found"));
  assert.equal((await q("category=Accessories&location=Cafeteria")).length, 1);
  assert.equal((await q("search=ZEBRA")).length, 1); // case-insensitive title
  assert.equal((await q("search=striped")).length, 1); // matches description
  assert.equal((await q("search=100%25")).length, 1); // % is searched literally
  assert.equal((await q("search=1%25%25")).length, 0); // not treated as a wildcard
  assert.equal((await q("dateFrom=2026-01-10&dateTo=2026-01-31")).length, 1);
  assert.equal((await q("dateFrom=2026-01-05&dateTo=2026-01-05")).length, 1); // inclusive
  assert.equal((await q("status=Returned")).length, 0);
  assert.equal((await call("GET", "/api/items?type=Banana")).status, 400);
  assert.equal((await call("GET", "/api/items?dateFrom=yesterday")).status, 400);
  // SQL injection attempt is just treated as text
  assert.equal((await call("GET", "/api/items?search=' OR 1=1 --")).status, 200);
  assert.equal((await q("search=' OR 1=1 --")).length, 0);
});

test("matches: sorted by date gap, 400 for a Found item, 404 for unknown", async () => {
  const lost = (await call("POST", "/api/items", base_item({ title: "Lost keys M", category: "Keys", location: "Courtyard", date: dayOffset(10) }))).body;
  const gap = MATCH_RULES.maxDaysApart;
  const near = (await call("POST", "/api/items", base_item({ type: "Found", title: "Found keys near", category: "Keys", location: "Courtyard", date: dayOffset(10) }))).body;
  const far = (await call("POST", "/api/items", base_item({ type: "Found", title: "Found keys far", category: "Keys", location: "Courtyard", date: dayOffset(10 - gap) }))).body;
  await call("POST", "/api/items", base_item({ type: "Found", title: "Too far", category: "Keys", location: "Courtyard", date: dayOffset(10 - gap - 1) }));
  await call("POST", "/api/items", base_item({ type: "Found", title: "Wrong place", category: "Keys", location: "Cafeteria", date: dayOffset(10) }));
  // same category, place and day - but nothing in common in the description, so NOT a match
  const noWords = (await call("POST", "/api/items", base_item({ type: "Found", title: "No shared word", description: "Black leather wallet", category: "Keys", location: "Courtyard", date: dayOffset(10) }))).body;

  const r = await call("GET", `/api/items/${lost.id}/matches`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.matches.map((m) => m.item.id), [near.id, far.id]);
  assert.ok(!r.body.matches.some((m) => m.item.id === noWords.id), "no shared description keyword -> not suggested");
  assert.equal(r.body.rules.minCommonKeywords, MATCH_RULES.minCommonKeywords);

  // ...and the server refuses to pair them even if someone asks directly
  const refused = await call("POST", `/api/items/${lost.id}/confirm-match`, { foundId: noWords.id });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error, "These two items are not a possible match");
  assert.equal(r.body.matches[0].daysApart, 0);
  // base_item descriptions are "Three keys on a ring", so the shared words are listed last
  assert.deepEqual(r.body.matches[0].reasons, ["Same category", "Same location", "Same day", "Shared words: three, keys, ring"]);
  assert.deepEqual(r.body.matches[0].sharedKeywords, ["three", "keys", "ring"]);
  assert.equal(r.body.matches[1].daysApart, gap);
  assert.equal(r.body.rules.maxDaysApart, gap);

  assert.equal((await call("GET", `/api/items/${near.id}/matches`)).status, 400);
  assert.equal((await call("GET", "/api/items/999999/matches")).status, 404);
});

test("confirm-match -> Matched pair -> mark-returned -> Returned pair", async () => {
  const lost = (await call("POST", "/api/items", base_item({ title: "Pair lost", category: "Bags", location: "Computer Lab" }))).body;
  const found = (await call("POST", "/api/items", base_item({ type: "Found", title: "Pair found", category: "Bags", location: "Computer Lab" }))).body;
  const other = (await call("POST", "/api/items", base_item({ type: "Found", title: "Other bag", category: "Bags", location: "Library" }))).body;

  // validation of the confirm request
  assert.equal((await call("POST", `/api/items/${lost.id}/confirm-match`, {})).status, 400);
  assert.equal((await call("POST", `/api/items/${lost.id}/confirm-match`, { foundId: other.id })).status, 400); // not a match
  assert.equal((await call("POST", `/api/items/${found.id}/confirm-match`, { foundId: lost.id })).status, 400); // wrong way round
  assert.equal((await call("POST", `/api/items/${lost.id}/mark-returned`)).status, 409); // not matched yet

  const ok = await call("POST", `/api/items/${lost.id}/confirm-match`, { foundId: found.id });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.lost.status, "Matched");
  assert.equal(ok.body.found.matchedWith, lost.id);
  assert.equal(ok.body.lost.matchedWith, found.id);
  assert.equal((await call("POST", `/api/items/${lost.id}/confirm-match`, { foundId: found.id })).status, 409);

  const overview = (await call("GET", "/api/matches")).body;
  const group = overview.groups.find((g) => g.lost.id === lost.id);
  assert.equal(group.partner.id, found.id);

  const ret = await call("POST", `/api/items/${found.id}/mark-returned`);
  assert.equal(ret.status, 200);
  assert.equal(ret.body.item.status, "Returned");
  assert.equal(ret.body.partner.status, "Returned");
  assert.equal((await call("GET", `/api/items/${lost.id}`)).body.status, "Returned");
  // Returned items drop out of matching
  assert.equal((await call("GET", `/api/items/${lost.id}/matches`)).body.matches.length, 0);
});

test("breaking or deleting a pair releases the partner back to Open", async () => {
  const mk = async () => {
    const lost = (await call("POST", "/api/items", base_item({ title: "Rel lost", category: "Clothing", location: "Gym" }))).body;
    const found = (await call("POST", "/api/items", base_item({ type: "Found", title: "Rel found", category: "Clothing", location: "Gym" }))).body;
    await call("POST", `/api/items/${lost.id}/confirm-match`, { foundId: found.id });
    return { lost, found };
  };

  // editing status back to Open un-matches both
  let { lost, found } = await mk();
  const edited = await call("PUT", `/api/items/${lost.id}`, { ...lost, status: "Open" });
  assert.equal(edited.body.status, "Open");
  assert.equal(edited.body.matchedWith, null);
  let partner = (await call("GET", `/api/items/${found.id}`)).body;
  assert.equal(partner.status, "Open");
  assert.equal(partner.matchedWith, null);

  // changing the location of a matched item also breaks the pair
  ({ lost, found } = await mk());
  const moved = await call("PUT", `/api/items/${lost.id}`, { ...lost, location: "Library", status: "Matched" });
  assert.equal(moved.body.status, "Open");
  assert.equal((await call("GET", `/api/items/${found.id}`)).body.status, "Open");

  // deleting one half frees the other
  ({ lost, found } = await mk());
  assert.equal((await call("DELETE", `/api/items/${lost.id}`)).status, 200);
  partner = (await call("GET", `/api/items/${found.id}`)).body;
  assert.equal(partner.status, "Open");
  assert.equal(partner.matchedWith, null);
});
