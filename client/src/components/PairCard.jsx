// A Lost item and the Found item it was matched with, side by side with a connector.
// Used on the Matches page ("ready to hand back") and the Returned page. `children` holds the actions.
import { Link2, Check } from "lucide-react";
import { ItemRow } from "./MatchResults";

const TONES = {
  matched: { box: "bg-matched-tint", badge: "bg-navy text-amber shadow-press", Icon: Link2 },
  returned: { box: "bg-returned-tint", badge: "bg-returned text-white", Icon: Check },
};

export default function PairCard({ first, second, tone = "matched", children }) {
  const { box, badge, Icon } = TONES[tone];
  return (
    <div className={`rounded-3xl border border-line p-5 shadow-card ${box}`}>
      <div className={`grid items-center gap-3 ${second ? "md:grid-cols-[1fr_auto_1fr]" : ""}`}>
        <div className="rounded-2xl border border-line bg-white p-4">
          <ItemRow item={first} />
        </div>
        {second && (
          <>
            <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${badge}`} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div className="rounded-2xl border border-line bg-white p-4">
              <ItemRow item={second} />
            </div>
          </>
        )}
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
