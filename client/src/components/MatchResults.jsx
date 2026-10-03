// Shows possible matches for a Lost item, plus the compact row used for a single report.
// The match logic itself lives on the server (server/matching.js): this only displays what it returns.
import { Link } from "react-router-dom";
import { MapPin, CalendarDays, Check, Link2, SearchX } from "lucide-react";
import { CATEGORY_ICONS } from "../constants";
import { formatDate } from "../lib";
import { TypeTag, StatusPill, btn } from "./ui";

/** A short sentence describing the current rule, built from the `rules` the server sends. */
export function describeRules(rules) {
  const parts = [];
  if (rules.requireSameCategory) parts.push("the same category");
  if (rules.requireSameLocation) parts.push("the same place");
  const days = `within ${rules.maxDaysApart} ${rules.maxDaysApart === 1 ? "day" : "days"} of the date`;
  let text = parts.length ? `${parts.join(" and ")}, ${days}` : days;
  const n = rules.minCommonKeywords || 0;
  if (n > 0) text += `, with ${n === 1 ? "at least one word" : `at least ${n} words`} in common in the description`;
  return text;
}

/** Compact one-report row: tag, linked title, place and date. */
export function ItemRow({ item, heading }) {
  const Icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Other;
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-soft text-navy">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={item.type} />
          {item.status !== "Open" && <StatusPill status={item.status} />}
          {heading && <span className="text-sm text-muted">{heading}</span>}
        </div>
        <Link to={`/items/${item.id}`} className="mt-1 block text-lg font-bold leading-snug text-navy hover:underline">
          {item.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" />
            {item.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={16} aria-hidden="true" />
            {formatDate(item.date)}
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * List of candidate Found items for one Lost item.
 *  - matches   : [{ item, daysApart, reasons }] from the API (already sorted, closest date first)
 *  - canConfirm: only true while the Lost item is still "Open"
 *  - onConfirm : called with the Found item's id
 */
export default function MatchResults({ matches, rules, canConfirm, busyId, onConfirm }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-field bg-white p-8 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-navy-soft text-navy">
          <SearchX size={24} aria-hidden="true" />
        </span>
        <p className="text-lg font-bold text-navy">No matches yet</p>
        <p className="mx-auto mt-1 max-w-md text-muted">
          We look for found items in {describeRules(rules)}. Nothing fits right now, but we will show it here as soon
          as someone reports it. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {matches.map(({ item, daysApart, reasons }) => {
        const taken = item.status !== "Open";
        return (
          <li
            key={item.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition duration-150 hover:border-navy/40 hover:shadow-card sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              <ItemRow item={item} />
              {/* Which conditions matched - this reflects whatever rule the server is using */}
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Why it matches: ${daysApart} days apart`}>
                {reasons.map((r) => (
                  <li
                    key={r}
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy-soft px-3 py-1 text-sm font-medium text-navy"
                  >
                    <Check size={14} aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            {canConfirm && (
              <div className="shrink-0">
                {taken ? (
                  <span className="text-sm font-medium text-muted">Already {item.status.toLowerCase()}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onConfirm(item.id)}
                    disabled={busyId !== null && busyId !== undefined}
                    className={btn("primary", "md", "w-full sm:w-auto")}
                  >
                    <Link2 size={18} aria-hidden="true" />
                    {busyId === item.id ? "Matching..." : "Confirm match"}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
