// The Returned tab: everything that made it back to its owner, kept apart from the reports
// people are still searching. A lost report and the found item it was matched with show as one pair.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { pairUp, usePageTitle } from "../lib";
import { btn, EmptyState, ErrorState } from "../components/ui";
import PairCard from "../components/PairCard";

export default function ReturnedPage() {
  usePageTitle("Returned");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.listItems({ status: "Returned" }).then((d) => { setItems(d); setError(""); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <div className="mx-auto max-w-4xl px-4 pt-8 md:pt-12"><ErrorState message={error} onRetry={load} /></div>;
  if (!items) return <div className="mx-auto max-w-4xl px-4 pt-8 text-muted" aria-busy="true">Loading returned items...</div>;

  const pairs = pairUp(items);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 md:pt-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">Returned</h1>
      <p className="mt-2 max-w-prose text-lg text-muted">
        {pairs.length === 0
          ? "Items that make it back to their owners will show up here."
          : `${pairs.length} ${pairs.length === 1 ? "item has" : "items have"} found ${pairs.length === 1 ? "its" : "their"} way home.`}
      </p>

      {pairs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing returned yet"
            actions={
              <>
                <Link to="/matches" className={btn("primary")}>See matches</Link>
                <Link to="/" className={btn("outline")}>Browse reports</Link>
              </>
            }
          >
            When a matched item is handed back, mark it as returned and it will be kept here.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {pairs.map((pair) => (
            <li key={pair.first.id}>
              <PairCard first={pair.first} second={pair.second} tone="returned" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
