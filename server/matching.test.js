// Run with:  npm test
//
// CURRENT RULE: same category + same location + at most 2 days apart + at least 1 shared
// description keyword.
//
// The five worked examples from the assignment are in EXAMPLES below, followed by the extra
// cases the keyword condition needs. After you change MATCH_RULES in matching.js, re-run
// `npm test`: any example whose behaviour changed will fail - update its `expected` value
// (and the note) to match your new rule.
const test = require("node:test");
const assert = require("node:assert/strict");
const { MATCH_RULES, evaluateMatch, findMatches, daysBetween, extractKeywords, sharedKeywords } = require("./matching");

// Small helper so each example reads like the assignment text. Unless a test says otherwise,
// every item's description is "Silver keys on a ring", so the keyword condition is satisfied.
const item = (type, category, location, date, extra = {}) => ({
  id: 1,
  type,
  title: "Test item",
  description: "Silver keys on a ring",
  category,
  location,
  date,
  status: "Open",
  ...extra,
});

const LOST = item("Lost", "Keys", "Library", "2026-03-10");

// ---- The 5 examples (edit `expected` when you change the rule) ---------------
// Lost item: Keys, Library, 2026-03-10. All Found items below share the keyword "keys".
const EXAMPLES = [
  { name: "Example 1: 3 days apart is NOT a match any more (limit is now 2 days)",
    found: item("Found", "Keys", "Library", "2026-03-13"), expected: false },
  { name: "Example 2: 4 days apart is too far",
    found: item("Found", "Keys", "Library", "2026-03-14"), expected: false },
  { name: "Example 3: different location",
    found: item("Found", "Keys", "Cafeteria", "2026-03-10"), expected: false },
  { name: "Example 4: different category",
    found: item("Found", "Bags", "Library", "2026-03-10"), expected: false },
  { name: "Example 5: found 2 days BEFORE the lost date is allowed",
    found: item("Found", "Keys", "Library", "2026-03-08"), expected: true },
];

for (const ex of EXAMPLES) {
  test(ex.name, () => {
    const result = evaluateMatch(LOST, ex.found);
    assert.equal(result !== null, ex.expected);
  });
}

// ---- The new conditions: the 2-day limit and the keyword requirement ------------

test("exactly 2 days apart is a match (the limit is inclusive), in either direction", () => {
  assert.notEqual(evaluateMatch(LOST, item("Found", "Keys", "Library", "2026-03-12")), null);
  assert.notEqual(evaluateMatch(LOST, item("Found", "Keys", "Library", "2026-03-08")), null);
});

test("everything else matches but NO shared description keyword -> no match", () => {
  const found = item("Found", "Keys", "Library", "2026-03-10", { description: "Black leather wallet" });
  assert.equal(evaluateMatch(LOST, found), null);
});

test("one shared keyword is enough", () => {
  const found = item("Found", "Keys", "Library", "2026-03-10", { description: "Black leather wallet with a ring" });
  const result = evaluateMatch(LOST, found);
  assert.notEqual(result, null);
  assert.deepEqual(result.sharedKeywords, ["ring"]);
});

test("filler words do not count as keywords (the, near, lost, found ...)", () => {
  const lost = item("Lost", "Keys", "Library", "2026-03-10", { description: "Lost near the desk" });
  const found = item("Found", "Keys", "Library", "2026-03-10", { description: "Found near the table" });
  assert.equal(evaluateMatch(lost, found), null);
});

test("plurals and capital letters still match (Keys / key, Notebooks / notebook)", () => {
  const lost = item("Lost", "Bags", "Library", "2026-03-10", { description: "Blue BAG with Notebooks" });
  const found = item("Found", "Bags", "Library", "2026-03-10", { description: "a notebook in a blue case" });
  assert.deepEqual(sharedKeywords(lost, found), ["blue", "notebooks"]);
  assert.notEqual(evaluateMatch(lost, found), null);
});

test("only the description is searched - a shared word in the title is not enough", () => {
  const lost = item("Lost", "Keys", "Library", "2026-03-10", { title: "Red keys", description: "Left at the desk" });
  const found = item("Found", "Keys", "Library", "2026-03-10", { title: "Red keys", description: "Handed to security" });
  assert.equal(evaluateMatch(lost, found), null);
  // ...unless the rule is told to look at titles as well
  const withTitles = { ...MATCH_RULES, keywordFields: ["title", "description"] };
  assert.notEqual(evaluateMatch(lost, found, withTitles), null);
});

test("extractKeywords drops short and filler words and reduces plurals", () => {
  const words = [...extractKeywords("The red Keys, and 2 glasses of batteries near ID card!").values()];
  assert.deepEqual(words, ["red", "keys", "glasses", "batteries", "card"]);
});

// ---- Extra checks on the surrounding behaviour --------------------------------

test("reasons list shows which conditions matched, including the shared words", () => {
  const r = evaluateMatch(LOST, item("Found", "Keys", "Library", "2026-03-12"));
  assert.deepEqual(r.reasons, ["Same category", "Same location", "2 days apart", "Shared words: silver, keys, ring"]);
  assert.equal(r.daysApart, 2);
  assert.deepEqual(r.sharedKeywords, ["silver", "keys", "ring"]);
});

test("same-day match says 'Same day'", () => {
  const r = evaluateMatch(LOST, item("Found", "Keys", "Library", "2026-03-10", { description: "One key on a ring" }));
  assert.deepEqual(r.reasons, ["Same category", "Same location", "Same day", "Shared words: keys, ring"]);
});

test("Returned items are excluded (either side)", () => {
  const found = item("Found", "Keys", "Library", "2026-03-10");
  assert.equal(evaluateMatch(LOST, { ...found, status: "Returned" }), null);
  assert.equal(evaluateMatch({ ...LOST, status: "Returned" }, found), null);
});

test("Matched items are still considered (only Returned is excluded by default)", () => {
  const found = item("Found", "Keys", "Library", "2026-03-10", { status: "Matched" });
  assert.notEqual(evaluateMatch(LOST, found), null);
});

test("two Lost items (or two Found items) never match each other", () => {
  assert.equal(evaluateMatch(LOST, item("Lost", "Keys", "Library", "2026-03-10")), null);
  assert.equal(
    evaluateMatch(item("Found", "Keys", "Library", "2026-03-10"), item("Found", "Keys", "Library", "2026-03-10")),
    null
  );
});

test("daysBetween compares calendar dates across month, year and DST boundaries", () => {
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
  assert.equal(daysBetween("2025-12-31", "2026-01-02"), 2);
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2); // DST change in many countries
  assert.equal(daysBetween("2026-03-10", "2026-03-10"), 0);
});

test("findMatches sorts by smallest date difference first", () => {
  const candidates = [
    item("Found", "Keys", "Library", "2026-03-12", { id: 10 }), // 2 days
    item("Found", "Keys", "Library", "2026-03-10", { id: 11 }), // 0 days
    item("Found", "Keys", "Library", "2026-03-09", { id: 12 }), // 1 day
    item("Found", "Keys", "Library", "2026-03-20", { id: 13 }), // too far
    item("Found", "Keys", "Library", "2026-03-10", { id: 15, description: "Black wallet" }), // no shared word
    item("Lost", "Keys", "Library", "2026-03-10", { id: 14 }), // wrong type
  ];
  const ids = findMatches(LOST, candidates).map((m) => m.item.id);
  assert.deepEqual(ids, [11, 12, 10]);
});

test("changing the rules object changes the result (config-driven)", () => {
  // One day beyond whatever maxDaysApart currently is, so this test survives rule changes.
  const gap = MATCH_RULES.maxDaysApart + 1;
  const farDate = new Date(Date.UTC(2026, 2, 10 + gap)).toISOString().slice(0, 10);
  const farFound = item("Found", "Keys", "Library", farDate);
  assert.equal(evaluateMatch(LOST, farFound), null);
  assert.notEqual(evaluateMatch(LOST, farFound, { ...MATCH_RULES, maxDaysApart: gap }), null);

  const otherPlace = item("Found", "Keys", "Cafeteria", "2026-03-10");
  assert.equal(evaluateMatch(LOST, otherPlace), null);
  const relaxed = evaluateMatch(LOST, otherPlace, { ...MATCH_RULES, requireSameLocation: false });
  assert.deepEqual(relaxed.reasons, ["Same category", "Same day", "Shared words: silver, keys, ring"]);

  // Switching the keyword requirement off ignores descriptions completely
  const unrelated = item("Found", "Keys", "Library", "2026-03-10", { description: "Black wallet" });
  assert.equal(evaluateMatch(LOST, unrelated), null);
  assert.notEqual(evaluateMatch(LOST, unrelated, { ...MATCH_RULES, minCommonKeywords: 0 }), null);
});
