// Home page: search + the two big "I lost / I found" buttons, then filters and the card grid.
// Only OPEN reports are listed here. Once a report is matched it moves to the Matches tab,
// and once it is returned it moves to the Returned tab, so they never mix with what people are searching.
// Filters live in the address bar (?type=Lost&category=Keys) so a filtered view can be shared or bookmarked.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SearchX, HandHeart, SlidersHorizontal, X, LayoutGrid } from "lucide-react";
import { api } from "../api";
import { CATEGORIES, CATEGORY_ICONS, LOCATION_GROUPS, LOCATION_EXTRAS } from "../constants";
import { usePageTitle } from "../lib";
import ItemCard from "../components/ItemCard";
import HeroArt from "../components/HeroArt";
import { btn, CardSkeletons, EmptyState, ErrorState, Select, inputClass } from "../components/ui";

const FILTER_KEYS = ["type", "category", "location", "dateFrom", "dateTo"];
const TYPE_TABS = [
  { value: "", label: "All reports", icon: LayoutGrid },
  { value: "Lost", label: "Lost", icon: SearchX },
  { value: "Found", label: "Found", icon: HandHeart },
];

export default function BrowsePage() {
  usePageTitle("Browse");
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null); // null = first load
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // only matters on phones
  const [reloadTick, setReloadTick] = useState(0);
  const [featured, setFeatured] = useState(null); // report shown on the hero's luggage tag (set once)

  // The search box keeps its own text and updates the address 250ms after typing stops.
  const urlSearch = params.get("search") || "";
  const [searchText, setSearchText] = useState(urlSearch);
  useEffect(() => setSearchText(urlSearch), [urlSearch]);
  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => updateParam("search", searchText), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function updateParam(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  }

  const activeFilterCount = FILTER_KEYS.filter((k) => params.get(k)).length + (urlSearch ? 1 : 0);
  const moreFilterCount = ["location", "dateFrom", "dateTo"].filter((k) => params.get(k)).length;
  const clearAll = () => {
    setSearchText("");
    setParams({}, { replace: true });
  };

  // Load whenever the filters in the address change.
  const query = params.toString();
  useEffect(() => {
    let ignore = false; // drop responses that arrive after a newer request
    setRefreshing(true);
    setError("");
    api
      .listItems({ ...Object.fromEntries(params), status: "Open" }) // matched / returned reports live in their own tabs
      .then((data) => {
        if (ignore) return;
        setItems(data);
        setFeatured((cur) => cur || data[0] || null);
      })
      .catch((e) => !ignore && setError(e.message))
      .finally(() => !ignore && setRefreshing(false));
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, reloadTick]);

  const dateField = (id, label, key) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={params.get(key) || ""}
        onChange={(e) => updateParam(key, e.target.value)}
        className={inputClass(false)}
      />
    </div>
  );
  const selectField = (id, label, key, options, allLabel, groups) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <Select
        id={id}
        value={params.get(key) || ""}
        onChange={(e) => updateParam(key, e.target.value)}
        placeholder={allLabel}
        options={options}
        groups={groups}
      />
    </div>
  );

  const currentType = params.get("type") || "";
  const currentCategory = params.get("category") || "";

  return (
    <>
      {/* ---- Hero: continues the navy header, like the navy block in the logo.
           The slanted bottom edge is a "fold" in the paper. Copy is deliberately short. ---- */}
      <section className="on-navy relative overflow-hidden bg-navy pb-24 text-white [clip-path:polygon(0_0,100%_0,100%_calc(100%-44px),0_100%)] md:pb-28">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(55%_60%_at_65%_45%,rgb(48_120_216/0.26),transparent)]" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-2 px-4 pt-6 md:grid-cols-[1fr_1.05fr] md:gap-6 md:pt-10">
          {/* On phones the picture sits above the headline, tucked to the right */}
          <HeroArt featured={featured} className="mb-1 ml-auto w-[220px] max-w-[65%] md:hidden" />

          <div>
            <h1 className="max-w-lg text-balance text-[2.5rem] font-extrabold leading-[1.04] md:text-5xl lg:text-6xl">
              Lost something? Don&rsquo;t worry, it might be here.
            </h1>
            <p className="mt-4 max-w-md text-lg text-[#d3dcea]">Search what&rsquo;s been handed in, or report an item.</p>

            <form role="search" className="mt-7 max-w-xl" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="search" className="sr-only">
                Search by item name or description
              </label>
              <div className="relative">
                <Search size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy" aria-hidden="true" />
                <input
                  id="search"
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Try &ldquo;keys&rdquo; or &ldquo;blue backpack&rdquo;"
                  autoComplete="off"
                  className="min-h-14 w-full rounded-2xl border-2 border-transparent bg-white py-3 pl-12 pr-4 text-lg text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.55)] placeholder:text-muted transition duration-150 focus-visible:outline-amber"
                />
              </div>
            </form>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link to="/report/lost" className={btn("accent", "lg")}>
                <SearchX size={22} aria-hidden="true" />
                I lost something
              </Link>
              <Link to="/report/found" className={btn("outlineOnNavy", "lg")}>
                <HandHeart size={22} aria-hidden="true" />
                I found something
              </Link>
            </div>
          </div>

          <HeroArt featured={featured} className="hidden w-full max-w-[600px] justify-self-end md:block" />
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-4">
        {/* ---- Filters ---- */}
        <section aria-label="Filter reports" className="rounded-3xl border border-line bg-white p-4 shadow-lift sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Lost / Found segmented switch */}
            <div role="group" aria-label="Show lost or found reports" className="grid w-full grid-cols-3 rounded-2xl bg-navy-soft p-1 sm:inline-grid sm:w-auto">
              {TYPE_TABS.map(({ value, label, icon: Icon }) => {
                const on = currentType === value;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => updateParam("type", value)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 font-semibold transition duration-150 sm:px-4 ${
                      on ? "bg-navy text-white shadow-sm" : "text-navy hover:bg-white/70"
                    }`}
                  >
                    <Icon size={18} className="hidden min-[400px]:block" aria-hidden="true" />
                    {value === "" ? (
                      <>
                        <span className="sm:hidden">All</span>
                        <span className="hidden sm:inline">{label}</span>
                      </>
                    ) : (
                      label
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <p className="mr-1 font-semibold" aria-live="polite">
                {items === null && !error
                  ? "Loading..."
                  : error
                    ? "Could not load"
                    : `${items.length} open ${items.length === 1 ? "report" : "reports"}`}
              </p>
              <button type="button" onClick={clearAll} disabled={activeFilterCount === 0} className={btn("quiet")}>
                <X size={18} aria-hidden="true" />
                Clear filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>

          {/* Category chips with icons */}
          <div className="chip-row -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
            {[null, ...CATEGORIES].map((c) => {
              const on = (c || "") === currentCategory;
              const Icon = c ? CATEGORY_ICONS[c] : LayoutGrid;
              return (
                <button
                  key={c || "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateParam("category", c || "")}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-medium transition duration-150 ${
                    on
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-white text-ink hover:border-navy/50 hover:bg-navy-soft"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {c || "All categories"}
                </button>
              );
            })}
          </div>

          {/* Remaining filters: always visible on tablets and up, behind a button on phones */}
          <div className="mt-4 md:hidden">
            <button
              type="button"
              className={btn("outline", "md", "w-full")}
              aria-expanded={filtersOpen}
              aria-controls="filter-fields"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              {filtersOpen ? "Hide more filters" : `More filters${moreFilterCount ? ` (${moreFilterCount})` : ""}`}
            </button>
          </div>
          <div
            id="filter-fields"
            className={`${filtersOpen ? "grid" : "hidden"} mt-4 grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid md:grid-cols-3`}
          >
            {selectField("f-location", "Place", "location", LOCATION_EXTRAS, "All places", LOCATION_GROUPS)}
            {dateField("f-from", "From date", "dateFrom")}
            {dateField("f-to", "To date", "dateTo")}
          </div>
        </section>

        {/* ---- Results ---- */}
        <section aria-labelledby="results-heading" className="mt-8">
          <h2 id="results-heading" className="sr-only">Reports</h2>
          {error ? (
            <ErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
          ) : items === null ? (
            <CardSkeletons />
          ) : items.length === 0 ? (
            activeFilterCount > 0 ? (
              <EmptyState
                title="No reports match those filters"
                actions={
                  <button type="button" onClick={clearAll} className={btn("primary")}>
                    Clear filters
                  </button>
                }
              >
                Try a different word, or remove a filter to see more.
              </EmptyState>
            ) : (
              <EmptyState
                title="No open reports right now"
                actions={
                  <>
                    <Link to="/report/lost" className={btn("accent")}>
                      I lost something
                    </Link>
                    <Link to="/report/found" className={btn("outline")}>
                      I found something
                    </Link>
                  </>
                }
              >
                Everything reported so far has been matched or returned. If you lost or found something, add a report. It only takes a minute.
              </EmptyState>
            )
          ) : (
            <ul
              className={`grid gap-5 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 ${refreshing ? "opacity-60" : ""}`}
              aria-busy={refreshing}
            >
              {items.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
