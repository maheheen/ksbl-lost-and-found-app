// Shared building blocks: buttons, tags, pills, faceted backdrops, form fields, empty/error states.
import { TriangleAlert, ChevronDown } from "lucide-react";
import { TYPE_STYLES, STATUS_STYLES } from "../constants";
import Bird from "./Bird";

// ---- Buttons --------------------------------------------------------------
// btn() returns class names so the same look works on <button> and <Link>.
// Every size is at least 44px tall (min-h-11) for easy tapping. A tiny press
// (scale .98) and a soft lift on hover make controls feel physical.
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 text-center";
const BTN_VARIANTS = {
  primary: "bg-navy text-white shadow-press hover:bg-navy-hover hover:-translate-y-px",
  accent:
    "bg-amber text-navy shadow-[0_1px_0_rgb(255_255_255/0.45)_inset,0_10px_20px_-10px_rgb(251_167_51/0.9)] hover:bg-amber-hover hover:-translate-y-px",
  outline: "border-2 border-navy/90 bg-white text-navy hover:bg-navy-soft",
  outlineOnNavy: "border-2 border-white/80 text-white hover:bg-white/10",
  danger: "bg-danger text-white hover:bg-danger-hover",
  dangerOutline: "border-2 border-danger bg-white text-danger hover:bg-lost-tint",
  quiet: "text-navy hover:bg-navy-soft",
};
const BTN_SIZES = { md: "min-h-11 px-4 py-2", lg: "min-h-14 px-6 py-3 text-lg" };

export const btn = (variant = "primary", size = "md", extra = "") =>
  `${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${extra}`;

// ---- Tags and pills (icon + word + colour, never colour alone) -------------
// `solid` puts the tag on white so it stays readable on top of an illustrated header.
export function TypeTag({ type, solid }) {
  const s = TYPE_STYLES[type];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        solid ? "bg-white shadow-sm ring-1 ring-black/5" : s.bg
      } ${s.text}`}
    >
      <Icon size={16} aria-hidden="true" />
      {type}
    </span>
  );
}

export function StatusPill({ status, solid }) {
  const s = STATUS_STYLES[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        solid ? "bg-white shadow-sm ring-1 ring-black/5" : s.bg
      } ${s.text}`}
    >
      <Icon size={16} aria-hidden="true" />
      {status}
    </span>
  );
}

// ---- Faceted backdrop -------------------------------------------------------
// Pale paper-fold triangles behind card headers. Three layouts, picked by `seed` (the item id),
// tinted with the Lost / Found colour so each report looks a little different.
const BACKDROPS = [
  [[0, 0, 150, 0, 0, 90, "t"], [150, 0, 300, 0, 220, 128, "n"], [0, 128, 120, 60, 220, 128, "w"], [220, 128, 300, 20, 300, 128, "t"]],
  [[0, 20, 110, 128, 0, 128, "n"], [110, 128, 190, 0, 300, 128, "t"], [60, 0, 190, 0, 110, 70, "w"], [190, 0, 300, 0, 300, 70, "n"]],
  [[0, 0, 90, 0, 40, 128, "t"], [90, 0, 230, 40, 40, 128, "w"], [230, 40, 300, 0, 300, 128, "n"], [40, 128, 230, 40, 300, 128, "t"]],
];
export function FacetBackdrop({ type, seed = 0, className = "" }) {
  const tint = type === "Lost" ? "#B42340" : "#1D5BB5";
  const fills = { t: { fill: tint, opacity: 0.13 }, n: { fill: "#05274F", opacity: 0.07 }, w: { fill: "#fff", opacity: 0.65 } };
  return (
    <svg viewBox="0 0 300 128" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      {BACKDROPS[Math.abs(seed) % BACKDROPS.length].map((p, i) => (
        <polygon key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} {...fills[p[6]]} />
      ))}
    </svg>
  );
}

// ---- Form fields ----------------------------------------------------------
export const inputClass = (invalid) =>
  `w-full min-h-12 rounded-xl border-2 bg-white px-3.5 py-2 text-ink shadow-[0_1px_2px_rgb(0_36_72/0.05)] placeholder:text-muted ` +
  `transition duration-150 hover:border-navy/60 focus-visible:border-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy/20 ` +
  `${invalid ? "border-danger" : "border-field"}`;

/** Label + control + hint + error message, wired together for screen readers. */
export function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-2 text-sm font-medium text-danger">
          <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** aria props that connect a control to its hint/error text. */
export const describedBy = (id, { hint, error }) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined,
});

/** Native <select> (best for keyboards and screen readers) with a drawn chevron. */
export function Select({ id, value, onChange, onBlur, placeholder, options = [], groups, invalid, ...rest }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`${inputClass(invalid)} appearance-none pr-10`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {/* `groups` = [{ label, items }] rendered as headed sections; `options` follow as plain choices */}
        {groups &&
          groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </optgroup>
          ))}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy"
        aria-hidden="true"
      />
    </div>
  );
}

// ---- Empty / error states -------------------------------------------------
export function EmptyState({ title, children, actions }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-card">
      <Bird tone="dark" className="mx-auto mb-4 w-44 opacity-90" />
      <h2 className="text-2xl font-bold">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-muted">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger bg-lost-tint px-6 py-8 text-center">
      <TriangleAlert size={32} className="mx-auto mb-3 text-danger" aria-hidden="true" />
      <p className="font-semibold text-ink">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={btn("primary", "md", "mt-4")}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Placeholder cards while loading: a soft light sweep, switched off for reduced motion. */
export function CardSkeletons({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="skeleton h-32" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-6 w-4/5 rounded-lg" />
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
            <div className="flex gap-2 pt-2">
              <div className="skeleton h-7 w-16 rounded-full" />
              <div className="skeleton h-7 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
