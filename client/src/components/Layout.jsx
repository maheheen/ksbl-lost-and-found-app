// Page frame: sticky navy header with the logo and pill navigation (desktop),
// a floating bottom navigation bar (phones), and a "skip to content" link for keyboard users.
import { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutGrid, SearchX, HandHeart, Link2, PackageCheck } from "lucide-react";

// A report page (/items/...) belongs to whichever tab matches the report's status:
// open -> Browse, matched -> Matches, returned -> Returned. The item pages tell us through this context.
const NavSectionContext = createContext(() => {});
export function useNavSection(section) {
  const setSection = useContext(NavSectionContext);
  useEffect(() => {
    setSection(section);
    return () => setSection(null);
  }, [section, setSection]);
}

// The navigation items. `match` decides when each one counts as the "current page".
const onItem = (p) => p.startsWith("/items");
const NAV = [
  { to: "/", label: "Browse", icon: LayoutGrid, match: (p, sec) => p === "/" || (onItem(p) && (sec || "browse") === "browse") },
  { to: "/report/lost", label: "Report Lost", icon: SearchX, match: (p) => p === "/report/lost" },
  { to: "/report/found", label: "Report Found", icon: HandHeart, match: (p) => p === "/report/found" },
  { to: "/matches", label: "Matches", icon: Link2, match: (p, sec) => p.startsWith("/matches") || (onItem(p) && sec === "matches") },
  { to: "/returned", label: "Returned", icon: PackageCheck, match: (p, sec) => p.startsWith("/returned") || (onItem(p) && sec === "returned") },
];

function TopNav({ pathname, section }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {NAV.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname, section);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold transition duration-150 lg:px-4 ${
              active ? "bg-white/15 text-white" : "text-[#d3dcea] hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={20} className={active ? "text-amber" : ""} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname, section }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-0.5 rounded-2xl border border-line bg-white/95 p-1.5 shadow-float backdrop-blur md:hidden"
    >
      {NAV.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname, section);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-start gap-1 rounded-xl px-0.5 pt-2 text-center text-[0.8rem] leading-tight transition duration-150 ${
              active ? "bg-navy font-bold text-white" : "font-medium text-muted"
            }`}
          >
            <Icon size={22} className={active ? "text-amber" : ""} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const [section, setSection] = useState(null);
  return (
    <NavSectionContext.Provider value={setSection}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-amber focus:px-4 focus:py-3 focus:font-bold focus:text-navy"
      >
        Skip to main content
      </a>

      <header className="on-navy sticky top-0 z-40 border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/ksbl-logo.png" alt="KSBL" className="h-14 w-auto" />
            <span className="font-display text-xl font-bold tracking-tight md:hidden lg:inline">Lost &amp; Found</span>
          </Link>
          <TopNav pathname={pathname} section={section} />
        </div>
      </header>

      {/* pb-28 leaves room for the floating bottom nav on phones */}
      <main id="main" tabIndex={-1} className="pb-28 outline-none md:pb-16">
        <Outlet />
      </main>

      <BottomNav pathname={pathname} section={section} />
    </NavSectionContext.Provider>
  );
}
