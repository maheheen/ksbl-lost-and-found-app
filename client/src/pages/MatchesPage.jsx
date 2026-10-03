// The Matches tab, in the order a person would act on it:
//   1. confirmed pairs that are ready to be handed back   2. lost reports that have possible matches
// Once a pair is handed back it moves to the Returned tab.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageCheck, Undo2 } from "lucide-react";
import { api } from "../api";
import { pairUp, usePageTitle } from "../lib";
import { btn, EmptyState, ErrorState } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import PairCard from "../components/PairCard";
import MatchResults, { ItemRow, describeRules } from "../components/MatchResults";
import { useToast } from "../components/Toast";

export default function MatchesPage() {
  usePageTitle("Matches");
  const toast = useToast();
  const [data, setData] = useState(null); // { rules, groups, matched }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // { lostId, foundId } while confirming
  const [returning, setReturning] = useState(null); // pair awaiting "mark as returned" confirmation
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.getMatchOverview(), api.listItems({ status: "Matched" })])
      .then(([overview, matched]) => {
        setData({ rules: overview.rules, groups: overview.groups, matched });
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function confirmMatch(lostId, foundId) {
    setBusy({ lostId, foundId });
    try {
      await api.confirmMatch(lostId, foundId);
      toast("Match confirmed. It is now under Ready to hand back.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(null);
      load();
    }
  }

  async function markReturned() {
    setWorking(true);
    try {
      await api.markReturned(returning.first.id);
      toast("Marked as returned. You will find it under Returned.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setWorking(false);
      setReturning(null);
      load();
    }
  }

  async function undoMatch(item) {
    try {
      await api.updateItem(item.id, { ...item, status: "Open" }); // the server releases the partner too
      toast("Match undone. Both reports are open again.");
    } catch (e) {
      toast(e.message, "error");
    }
    load();
  }

  if (error) return <div className="mx-auto max-w-4xl px-4 pt-8 md:pt-12"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <div className="mx-auto max-w-4xl px-4 pt-8 text-muted" aria-busy="true">Loading matches...</div>;

  const waiting = pairUp(data.matched);
  const possible = data.groups.filter((g) => g.lost.status === "Open" && g.matches.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 md:pt-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">Matches</h1>
      <p className="mt-2 max-w-prose text-lg text-muted">
        Lost reports and found items that look like the same thing: {describeRules(data.rules)}.
      </p>

      {waiting.length + possible.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No matches yet"
            actions={
              <>
                <Link to="/" className={btn("primary")}>Browse reports</Link>
                <Link to="/returned" className={btn("outline")}>See returned items</Link>
              </>
            }
          >
            When a found item fits a lost report, it will show up here. Items already handed back are under Returned.
          </EmptyState>
        </div>
      )}

      {waiting.length > 0 && (
        <section className="mt-8" aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="flex items-center gap-3 text-2xl font-bold">
            Ready to hand back
            <span className="rounded-full bg-matched-tint px-3 py-0.5 text-base font-semibold text-matched">{waiting.length}</span>
          </h2>
          <ul className="mt-4 space-y-4">
            {waiting.map((pair) => (
              <li key={pair.first.id}>
                <PairCard first={pair.first} second={pair.second}>
                  <button type="button" className={btn("primary")} onClick={() => setReturning(pair)}>
                    <PackageCheck size={18} aria-hidden="true" />
                    Mark as returned
                  </button>
                  <button type="button" className={btn("outline")} onClick={() => undoMatch(pair.first)}>
                    <Undo2 size={18} aria-hidden="true" />
                    Undo match
                  </button>
                </PairCard>
              </li>
            ))}
          </ul>
        </section>
      )}

      {possible.length > 0 && (
        <section className="mt-10" aria-labelledby="possible-heading">
          <h2 id="possible-heading" className="flex items-center gap-3 text-2xl font-bold">
            Possible matches
            <span className="rounded-full bg-navy-soft px-3 py-0.5 text-base font-semibold text-navy">{possible.length}</span>
          </h2>
          <ul className="mt-4 space-y-6">
            {possible.map(({ lost, matches }) => (
              <li key={lost.id} className="rounded-3xl border border-line bg-white p-5 shadow-card">
                <ItemRow item={lost} heading="Lost report" />
                <h3 className="mb-3 mt-5 font-bold">
                  {matches.length} possible {matches.length === 1 ? "match" : "matches"}
                </h3>
                <MatchResults
                  matches={matches}
                  rules={data.rules}
                  canConfirm
                  busyId={busy && busy.lostId === lost.id ? busy.foundId : null}
                  onConfirm={(foundId) => confirmMatch(lost.id, foundId)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={!!returning}
        title="Mark as returned?"
        confirmLabel="Yes, it was returned"
        busy={working}
        onConfirm={markReturned}
        onCancel={() => setReturning(null)}
      >
        {returning && (
          <>
            “{returning.first.title}”
            {returning.second ? " and its matching report will both be closed as Returned." : " will be closed as Returned."}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
