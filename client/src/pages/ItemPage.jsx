// Full details for one report, with edit / delete, and the match workflow:
// Lost + Open -> see possible matches -> confirm -> Matched -> mark as returned.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Link2, MapPin, CalendarDays, Undo2, PackageCheck, CircleCheck, Tag, Check } from "lucide-react";
import { api } from "../api";
import { CATEGORY_ICONS, TYPE_STYLES } from "../constants";
import { formatDate, usePageTitle, SECTION_FOR_STATUS } from "../lib";
import { btn, ErrorState, EmptyState, StatusPill, TypeTag, FacetBackdrop } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import MatchResults, { ItemRow } from "../components/MatchResults";
import { useToast } from "../components/Toast";
import { useNavSection } from "../components/Layout";

export default function ItemPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [item, setItem] = useState(null);
  const [partner, setPartner] = useState(null); // the other half of a confirmed pair
  const [error, setError] = useState({ message: "", status: 0 });
  const [showMatches, setShowMatches] = useState(params.get("matches") === "1");
  const [matchData, setMatchData] = useState(null); // { matches, rules }
  const [possibleOwners, setPossibleOwners] = useState([]); // for a Found item: Lost reports that could be it
  const [busyId, setBusyId] = useState(null);
  const [dialog, setDialog] = useState(null); // "delete" | "returned" | null
  const [working, setWorking] = useState(false);
  usePageTitle(item ? item.title : "Report");
  // Highlight the tab this report lives under (open -> Browse, matched -> Matches, returned -> Returned)
  useNavSection(item ? SECTION_FOR_STATUS[item.status] : null);

  // Loads the item and whatever extra info its type/status needs.
  const load = useCallback(async () => {
    try {
      const it = await api.getItem(id);
      setItem(it);
      setError({ message: "", status: 0 });
      setPartner(it.matchedWith ? await api.getItem(it.matchedWith).catch(() => null) : null);
      if (it.type === "Lost" && it.status === "Open") {
        setMatchData(await api.getMatches(id));
      } else {
        setMatchData(null);
      }
      if (it.type === "Found" && it.status === "Open") {
        const overview = await api.getMatchOverview();
        setPossibleOwners(overview.groups.filter((g) => g.matches.some((m) => m.item.id === it.id)).map((g) => g.lost));
      } else {
        setPossibleOwners([]);
      }
    } catch (e) {
      setError({ message: e.message, status: e.status });
    }
  }, [id]);

  useEffect(() => {
    setItem(null);
    load();
  }, [load]);

  async function confirmMatch(foundId) {
    setBusyId(foundId);
    try {
      await api.confirmMatch(item.id, foundId);
      toast("Match confirmed. You will find the pair under Matches.");
      setShowMatches(false);
      await load();
    } catch (e) {
      toast(e.message, "error");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function markReturned() {
    setWorking(true);
    try {
      await api.markReturned(item.id);
      toast("Marked as returned. You will find it under Returned.");
      setDialog(null);
      await load();
    } catch (e) {
      toast(e.message, "error");
      setDialog(null);
    } finally {
      setWorking(false);
    }
  }

  async function undoMatch() {
    try {
      await api.updateItem(item.id, { ...item, status: "Open" }); // the server releases the partner too
      toast("Match undone. Both reports are open again.");
      await load();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function remove() {
    setWorking(true);
    try {
      await api.deleteItem(item.id);
      toast("Report deleted.");
      navigate("/");
    } catch (e) {
      toast(e.message, "error");
      setDialog(null);
      setWorking(false);
    }
  }

  if (error.message) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8">
        {error.status === 404 ? (
          <EmptyState
            title="We can't find that report"
            actions={<Link to="/" className={btn("primary")}>Back to browse</Link>}
          >
            It may have been deleted. Go back to the list to see what is there.
          </EmptyState>
        ) : (
          <ErrorState message={error.message} onRetry={load} />
        )}
      </div>
    );
  }
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8" aria-busy="true">
        <div className="h-8 w-40 rounded bg-open-tint" />
        <div className="mt-6 h-64 rounded-2xl border border-line bg-white" />
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Other;
  const verb = item.type === "Found" ? "found" : "lost";
  const canSeeMatches = item.type === "Lost" && item.status === "Open";
  // "Back" goes to the tab this report lives under
  const back = { Open: { to: "/", label: "Back to browse" }, Matched: { to: "/matches", label: "Back to matches" }, Returned: { to: "/returned", label: "Back to returned" } }[item.status];

  // Three-step progress shown in the side panel: Reported -> Matched -> Returned.
  const stepIndex = { Open: 0, Matched: 1, Returned: 2 }[item.status];
  const steps = [
    { label: item.type === "Lost" ? "Reported lost" : "Reported found", note: formatDate(item.date) },
    { label: item.type === "Lost" ? "Match found" : "Owner found", note: stepIndex >= 1 ? "A pair was confirmed" : "Waiting for a match" },
    { label: "Returned", note: stepIndex >= 2 ? "Back with its owner" : "Not yet" },
  ];

  // A <div> inside <dl> may only hold <dt>/<dd>, so the icon lives inside the <dt>.
  const detail = (Icon, label, value) => (
    <div className="rounded-2xl bg-navy-soft/70 p-4">
      <dt className="flex items-center gap-2 text-sm text-muted">
        <Icon size={18} className="text-navy" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <Link to={back.to} className="-ml-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-navy transition duration-150 hover:bg-navy-soft">
        <ArrowLeft size={20} aria-hidden="true" />
        {back.label}
      </Link>

      <div className="mt-3 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <article
            className="fold-corner relative rounded-3xl border border-line bg-white shadow-card"
            style={{ "--flap": TYPE_STYLES[item.type].flap, "--fold": "44px" }}
          >
            {/* Illustrated header band */}
            <div className="relative h-40 overflow-hidden rounded-t-3xl bg-navy-soft">
              <FacetBackdrop type={item.type} seed={item.id} className="absolute inset-0 h-full w-full" />
              <div className="absolute left-5 top-5 flex flex-wrap gap-2 pr-14 sm:left-8">
                <TypeTag type={item.type} solid />
                <StatusPill status={item.status} solid />
              </div>
              <span className="absolute bottom-5 left-5 grid h-16 w-16 place-items-center rounded-2xl bg-white text-navy shadow-sm ring-1 ring-black/5 sm:left-8">
                <CategoryIcon size={32} aria-hidden="true" />
              </span>
            </div>

            <div className="p-5 sm:p-8">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{item.title}</h1>

              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {detail(CategoryIcon, "Category", item.category)}
                {detail(MapPin, `Where it was ${verb}`, item.location)}
                {detail(CalendarDays, `When it was ${verb}`, formatDate(item.date))}
              </dl>

              <div className="mt-7">
                <h2 className="text-lg font-bold">Description</h2>
                <p className="mt-1 max-w-prose whitespace-pre-line text-lg">{item.description}</p>
              </div>
            </div>
          </article>

      {/* ---- Lost + Open: possible matches ---- */}
      {canSeeMatches && (
        <section className="mt-6" aria-labelledby="matches-heading">
          <h2 id="matches-heading" className="sr-only">Possible matches</h2>
          <button
            type="button"
            className={btn("primary", "lg", "w-full sm:w-auto")}
            aria-expanded={showMatches}
            aria-controls="match-panel"
            onClick={() => setShowMatches((s) => !s)}
          >
            <Link2 size={22} aria-hidden="true" />
            See possible matches
            {matchData && (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-navy">{matchData.matches.length}</span>
            )}
          </button>
          {showMatches && (
            <div id="match-panel" className="mt-4">
              {matchData ? (
                <MatchResults
                  matches={matchData.matches}
                  rules={matchData.rules}
                  canConfirm
                  busyId={busyId}
                  onConfirm={confirmMatch}
                />
              ) : (
                <p className="text-muted" aria-busy="true">Looking for matches...</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---- Matched: show the partner, allow Returned / Undo ---- */}
      {item.status === "Matched" && (
        <section className="mt-6 rounded-3xl border border-line bg-matched-tint p-5 shadow-card sm:p-6" aria-labelledby="pair-heading">
          <h2 id="pair-heading" className="flex items-center gap-2 text-xl font-bold text-matched">
            <Link2 size={22} aria-hidden="true" />
            This report is matched
          </h2>
          {partner && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <ItemRow item={partner} heading={partner.type === "Found" ? "Found item" : "Lost report"} />
            </div>
          )}
          <p className="mt-4 text-ink">
            When {item.type === "Lost" ? "you have your item back" : "it has been handed to its owner"}, mark it as
            returned to close both reports.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setDialog("returned")} className={btn("primary")}>
              <PackageCheck size={18} aria-hidden="true" />
              Mark as returned
            </button>
            <button type="button" onClick={undoMatch} className={btn("outline")}>
              <Undo2 size={18} aria-hidden="true" />
              Undo match
            </button>
          </div>
        </section>
      )}

      {item.status === "Returned" && (
        <section className="mt-6 rounded-3xl border border-line bg-returned-tint p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-returned">
            <CircleCheck size={22} aria-hidden="true" />
            This item has been returned
          </h2>
          {partner && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <ItemRow item={partner} heading={partner.type === "Found" ? "Found item" : "Lost report"} />
            </div>
          )}
        </section>
      )}

      {/* ---- Found + Open: lost reports that might be the owner ---- */}
      {item.type === "Found" && item.status === "Open" && possibleOwners.length > 0 && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="owners-heading">
          <h2 id="owners-heading" className="flex items-center gap-2 text-xl font-bold">
            <Tag size={22} aria-hidden="true" />
            Someone may be looking for this
          </h2>
          <p className="mt-1 text-muted">These lost reports could match. Open one to confirm the match.</p>
          <ul className="mt-4 space-y-4">
            {possibleOwners.map((l) => (
              <li key={l.id} className="rounded-xl border border-line p-4">
                <ItemRow item={l} />
              </li>
            ))}
          </ul>
        </section>
      )}

        </div>

        {/* ---- Side panel: progress + actions ---- */}
        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Progress and actions">
          <section className="rounded-3xl border border-line bg-white p-5 shadow-card" aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="text-lg font-bold">Progress</h2>
            <ol className="mt-4">
              {steps.map((st, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <li key={st.label} className="relative flex gap-3 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
                    {i < steps.length - 1 && (
                      <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${done ? "bg-navy" : "bg-line"}`} aria-hidden="true" />
                    )}
                    <span
                      className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                        done || (current && stepIndex === 2)
                          ? "border-navy bg-navy text-white"
                          : current
                            ? "border-amber bg-amber text-navy"
                            : "border-line bg-white text-muted"
                      }`}
                    >
                      {done || (current && stepIndex === 2) ? <Check size={16} aria-hidden="true" /> : <span className="text-sm font-bold">{i + 1}</span>}
                    </span>
                    <div>
                      <p className={`font-semibold leading-8 ${current || done ? "text-ink" : "text-muted"}`}>
                        {st.label}
                        <span className="visually-hidden">{done ? " (done)" : current ? " (current step)" : " (not yet)"}</span>
                      </p>
                      <p className="text-sm text-muted">{st.note}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 shadow-card" aria-label="Actions">
            <div className="grid gap-3">
              <Link to={`/items/${item.id}/edit`} className={btn("outline")}>
                <Pencil size={18} aria-hidden="true" />
                Edit report
              </Link>
              <button type="button" onClick={() => setDialog("delete")} className={btn("dangerOutline")}>
                <Trash2 size={18} aria-hidden="true" />
                Delete report
              </button>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete this report?"
        confirmLabel="Delete report"
        tone="danger"
        busy={working}
        onConfirm={remove}
        onCancel={() => setDialog(null)}
      >
        “{item.title}” will be removed for good. This cannot be undone.
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "returned"}
        title="Mark as returned?"
        confirmLabel="Yes, it was returned"
        busy={working}
        onConfirm={markReturned}
        onCancel={() => setDialog(null)}
      >
        Both this report and its matching report will be closed as Returned.
      </ConfirmDialog>
    </div>
  );
}
