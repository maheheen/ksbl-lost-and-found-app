// Server-side validation. The client validates too, but we never trust the client.
const { TYPES, CATEGORIES, LOCATIONS, STATUSES } = require("./constants");

/** Today's date as YYYY-MM-DD in the server's local time zone. */
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-31). */
function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Validate the body of POST / PUT /api/items.
 * Returns { errors, value }:
 *   errors - { field: "plain-language message" } (empty object when valid)
 *   value  - the cleaned item (trimmed strings, default status) to save
 * `isCreate` lets POST default the status to "Open".
 */
function validateItem(body, { isCreate }) {
  const errors = {};
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const text = (v) => (typeof v === "string" ? v.trim() : "");

  const type = src.type;
  if (!TYPES.includes(type)) errors.type = 'Type is required and must be "Lost" or "Found"';

  const title = text(src.title);
  if (!title) errors.title = "Title is required";
  else if (title.length < 3) errors.title = "Title must be at least 3 characters";
  else if (title.length > 100) errors.title = "Title must be 100 characters or fewer";

  const description = text(src.description);
  if (!description) errors.description = "Description is required";
  else if (description.length > 500) errors.description = "Description must be 500 characters or fewer";

  const category = src.category;
  if (!CATEGORIES.includes(category)) errors.category = "Category is required and must be one of the listed options";

  const location = src.location;
  if (!LOCATIONS.includes(location)) errors.location = "Location is required and must be one of the listed options";

  const date = typeof src.date === "string" ? src.date.trim() : src.date;
  if (date === undefined || date === null || date === "") errors.date = "Date is required";
  else if (!isValidISODate(date)) errors.date = "Date must be a real date in YYYY-MM-DD format";
  else if (date > todayISO()) errors.date = "Date cannot be in the future";

  let status = src.status;
  if ((status === undefined || status === null || status === "") && isCreate) status = "Open";
  if (status === undefined || status === null || status === "") errors.status = "Status is required";
  else if (!STATUSES.includes(status)) errors.status = 'Status must be "Open", "Matched" or "Returned"';

  return { errors, value: { type, title, description, category, location, date, status } };
}

module.exports = { validateItem, isValidISODate, todayISO };
