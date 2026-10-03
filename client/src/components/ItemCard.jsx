import { Link } from "react-router-dom";
import { MapPin, CalendarDays, Link2 } from "lucide-react";
import { CATEGORY_ICONS, TYPE_STYLES } from "../constants";
import { formatDate } from "../lib";
import { TypeTag, StatusPill, FacetBackdrop, btn } from "./ui";

/**
 * One report in the browse grid.
 *  - The header is a little paper-fold illustration tinted for Lost / Found, with the tags on it.
 *  - The folded top-right corner is drawn in CSS (.fold-corner) and opens a bit on hover.
 *  - The whole card is clickable through a "stretched" link on the title (one tab stop, one
 *    screen-reader link); the matches button sits above it with z-10.
 */
export default function ItemCard({ item }) {
  const CategoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Other;
  const canSeeMatches = item.type === "Lost" && item.status === "Open";

  return (
    <article
      className="fold-corner group relative flex h-full flex-col rounded-2xl border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-1 hover:border-navy/40 hover:shadow-lift has-[a.stretched:focus-visible]:outline-3 has-[a.stretched:focus-visible]:outline-offset-2 has-[a.stretched:focus-visible]:outline-navy"
      style={{ "--flap": TYPE_STYLES[item.type].flap }}
    >
      {/* Illustrated header */}
      <div className="relative h-32 shrink-0 overflow-hidden rounded-t-2xl bg-navy-soft">
        <FacetBackdrop type={item.type} seed={item.id} className="absolute inset-0 h-full w-full" />
        <div className="absolute left-4 right-12 top-4 flex flex-wrap gap-2">
          <TypeTag type={item.type} solid />
          <StatusPill status={item.status} solid />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-navy shadow-sm ring-1 ring-black/5 transition duration-200 group-hover:-rotate-3 group-hover:scale-105">
            <CategoryIcon size={26} aria-hidden="true" />
          </span>
          <span className="font-semibold text-navy">{item.category}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-xl leading-snug">
          <Link
            to={`/items/${item.id}`}
            className="stretched after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
          >
            {item.title}
          </Link>
        </h3>

        <p className="line-clamp-2 text-muted">{item.description}</p>

        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" />
            <span className="visually-hidden">Place: </span>
            {item.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="visually-hidden">Date: </span>
            {formatDate(item.date)}
          </span>
        </p>

        {canSeeMatches && (
          // relative + z-10 lifts this button above the stretched title link
          <Link
            to={`/items/${item.id}?matches=1`}
            className={btn("outline", "md", "relative z-10 w-full")}
            aria-label={`See possible matches for ${item.title}`}
          >
            <Link2 size={18} aria-hidden="true" />
            See possible matches
          </Link>
        )}
      </div>
    </article>
  );
}
