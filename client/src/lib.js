import { useEffect } from "react";

/** Today as YYYY-MM-DD in the browser's local time (used for the date default and max). */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-03-10" -> "10 Mar 2026". Parsed by hand so time zones can never shift the day. */
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Sets the browser tab title (also what screen readers announce on page change). */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} - KSBL Lost & Found` : "KSBL Lost & Found";
  }, [title]);
}

/** Wording that changes with Lost / Found so the form always asks the natural question. */
export function verbFor(type) {
  return type === "Found" ? "find" : "lose";
}

/**
 * Groups a flat list of items into pairs: a confirmed Lost item and its Found partner end up
 * together, and an item without a partner (or whose partner is not in the list) stands alone.
 * Returns [{ first, second }] with the Lost item first; `second` is null for singles.
 */
export function pairUp(items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const partner = item.matchedWith ? byId.get(item.matchedWith) : null;
    if (partner) seen.add(partner.id);
    const lostFirst = partner && partner.type === "Lost" && item.type !== "Lost";
    out.push(lostFirst ? { first: partner, second: item } : { first: item, second: partner || null });
  }
  return out;
}

/** Which navigation tab an item belongs to, from its status. */
export const SECTION_FOR_STATUS = { Open: "browse", Matched: "matches", Returned: "returned" };
