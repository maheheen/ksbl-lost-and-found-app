// ============================================================================
//  MATCHING MODULE - the ONLY place where Lost/Found matching logic lives.
// ============================================================================
//
//  A Lost item L matches a Found item F when ALL of these are true:
//    1. L.type is "Lost" and F.type is "Found"
//    2. same category            (if requireSameCategory)
//    3. same location            (if requireSameLocation)
//    4. calendar dates are at most maxDaysApart days apart (inclusive, either direction)
//    5. the descriptions share at least minCommonKeywords keywords (see "Keywords" below)
//  Items whose status is in excludeStatuses (e.g. "Returned") never match.
//
//  Matches are sorted with the smallest date difference first.
//
//  To change the rule, edit MATCH_RULES below - nothing else needs to change.
//  (Then re-run `npm test` and update the expected results in matching.test.js.)
// ============================================================================

const MATCH_RULES = {
  maxDaysApart: 2, // largest allowed gap between the two dates, in days (inclusive)
  requireSameCategory: true, // false = category does not have to be equal
  requireSameLocation: true, // false = location does not have to be equal
  minCommonKeywords: 1, // how many description keywords the two reports must share (0 = ignore keywords)
  keywordFields: ["description"], // which fields are searched for keywords (add "title" to include it)
  excludeStatuses: ["Returned"], // items with these statuses are never matched
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days between two "YYYY-MM-DD" strings (always >= 0).
 * We build both dates in UTC at midnight, so daylight-saving changes and
 * time-of-day can never shift the result.
 */
function daysBetween(dateA, dateB) {
  const toUtcDay = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round(Math.abs(toUtcDay(dateA) - toUtcDay(dateB)) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
//  Keywords
//  A keyword is a meaningful word from the description. To compare two descriptions fairly we:
//    - lower-case the text and split it into words (letters and digits only)
//    - drop very short words (under 3 characters) and common filler words (STOP_WORDS)
//    - reduce simple plurals to one form, so "keys" matches "key" and "notebooks" matches "notebook"
//  Two reports share a keyword when the same reduced word appears in both descriptions.
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set(
  (
    // articles, pronouns, linking words, common verbs
    "the and for with from into onto over under near next about than then that this these those there here " +
    "are was were been being has have had having not but you your our their his her its who what when where which " +
    "can could would should will just very also too any some all one two out off too " +
    // words that appear in nearly every lost-and-found report, so they say nothing about the item
    "lost found left item items thing things please handed hand kept put"
  ).split(" ")
);

/** Reduces a simple plural to its singular form: keys -> key, glasses -> glass, batteries -> battery. */
function singular(word) {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && /(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * The keywords of a piece of text, as a Map of reduced-word -> the word as written
 * (so the UI can show the original spelling). Insertion order follows the text.
 */
function extractKeywords(text) {
  const keywords = new Map();
  for (const word of String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    const key = singular(word);
    if (!keywords.has(key)) keywords.set(key, word);
  }
  return keywords;
}

/** The keywords two reports have in common (spelled as in the Lost report), in order of appearance. */
function sharedKeywords(lost, found, rules = MATCH_RULES) {
  const text = (item) => rules.keywordFields.map((field) => item[field]).join(" ");
  const foundKeywords = extractKeywords(text(found));
  const shared = [];
  for (const [key, word] of extractKeywords(text(lost))) {
    if (foundKeywords.has(key)) shared.push(word);
  }
  return shared;
}

/** Human text for the gap, e.g. "Same day", "1 day apart", "3 days apart". */
function describeGap(days) {
  if (days === 0) return "Same day";
  return `${days} ${days === 1 ? "day" : "days"} apart`;
}

/**
 * Decide whether `lost` and `found` match under `rules`.
 * Returns null when they do not match, otherwise:
 *   {
 *     daysApart: 2,
 *     conditions: { sameCategory: true, sameLocation: true },
 *     sharedKeywords: ["keys", "red"],
 *     reasons: ["Same category", "Same location", "2 days apart", "Shared words: keys, red"]   // shown in the UI
 *   }
 */
function evaluateMatch(lost, found, rules = MATCH_RULES) {
  // Rule 1: the right way round - a Lost item against a Found item.
  if (lost.type !== "Lost" || found.type !== "Found") return null;

  // Returned (or any other excluded status) items are out of the game.
  if (rules.excludeStatuses.includes(lost.status)) return null;
  if (rules.excludeStatuses.includes(found.status)) return null;

  // Rules 2 and 3: category and location.
  const sameCategory = lost.category === found.category;
  const sameLocation = lost.location === found.location;
  if (rules.requireSameCategory && !sameCategory) return null;
  if (rules.requireSameLocation && !sameLocation) return null;

  // Rule 4: dates. Found-before-lost is fine because we use the absolute gap.
  const daysApart = daysBetween(lost.date, found.date);
  if (daysApart > rules.maxDaysApart) return null;

  // Rule 5: the descriptions must have enough keywords in common.
  const shared = sharedKeywords(lost, found, rules);
  if (shared.length < rules.minCommonKeywords) return null;

  // Build the "why did this match" list shown next to each result.
  const reasons = [];
  if (sameCategory) reasons.push("Same category");
  if (sameLocation) reasons.push("Same location");
  reasons.push(describeGap(daysApart));
  if (shared.length > 0) {
    reasons.push(`Shared ${shared.length === 1 ? "word" : "words"}: ${shared.slice(0, 3).join(", ")}`);
  }

  return { daysApart, conditions: { sameCategory, sameLocation }, sharedKeywords: shared, reasons };
}

/**
 * All items from `candidates` that match the Lost item `lost`, closest date first.
 * `candidates` can be the whole items table; non-Found rows are skipped by evaluateMatch.
 * Returns [{ item, daysApart, conditions, sharedKeywords, reasons }, ...]
 */
function findMatches(lost, candidates, rules = MATCH_RULES) {
  const results = [];
  for (const item of candidates) {
    const result = evaluateMatch(lost, item, rules);
    if (result) results.push({ item, ...result });
  }
  // Smallest date difference first; ties go to the most recent report for a stable order.
  return results.sort((a, b) => a.daysApart - b.daysApart || b.item.id - a.item.id);
}

module.exports = { MATCH_RULES, daysBetween, describeGap, extractKeywords, sharedKeywords, evaluateMatch, findMatches };
