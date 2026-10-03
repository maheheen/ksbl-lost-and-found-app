// /report/lost and /report/found - the same form, worded for whichever one you picked.
import { useNavigate, useParams } from "react-router-dom";
import { Palette, MapPinned, Fingerprint, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { usePageTitle } from "../lib";
import ItemForm from "../components/ItemForm";
import Bird from "../components/Bird";
import { useToast } from "../components/Toast";

// Short, practical tips that sit beside the form on wide screens.
const TIPS = {
  Lost: [
    [Palette, "Colour and brand", "Reports are matched on shared words, so name the colour, brand or type of item."],
    [MapPinned, "The last place you had it", "Pick the closest place. We only match items from the same spot."],
    [Fingerprint, "Marks or contents", "A scratch, a sticker or a name inside makes it easy to confirm."],
  ],
  Found: [
    [Palette, "Colour and brand", "Reports are matched on shared words, so describe what it looks like."],
    [MapPinned, "Where you found it", "Pick the closest place so the owner's report can match yours."],
    [ShieldCheck, "Keep one detail back", "Leave out something only the owner would know, such as what is inside."],
  ],
};

export default function ReportPage() {
  const { kind } = useParams(); // "lost" or "found"
  const type = kind === "found" ? "Found" : "Lost";
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle(type === "Found" ? "Report a found item" : "Report a lost item");

  async function save(values) {
    const created = await api.createItem({ ...values, status: "Open" });
    toast(type === "Found" ? "Found item reported. Thank you!" : "Lost item reported.");
    // For a lost item, jump straight to any possible matches.
    navigate(`/items/${created.id}${created.type === "Lost" ? "?matches=1" : ""}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 md:pt-12">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h1 className="text-4xl font-extrabold md:text-5xl">{type === "Found" ? "Tell us what you found" : "Tell us what you lost"}</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">
            {type === "Found"
              ? "The more detail you add, the easier it is to return it to its owner."
              : "Add as much detail as you can. We will check for found items that could be yours."}
          </p>
          <div className="mt-8 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8">
            <ItemForm
              mode="create"
              type={type}
              onTypeChange={(t) => navigate(`/report/${t.toLowerCase()}`, { replace: true })}
              onSubmit={save}
              cancelTo="/"
            />
          </div>
        </div>

        {/* Tips panel: navy, with the bird, echoing the hero */}
        <aside className="on-navy relative hidden overflow-hidden rounded-3xl bg-navy p-7 text-white shadow-lift lg:sticky lg:top-24 lg:block" aria-label="Tips for a good report">
          <Bird tone="light" className="pointer-events-none absolute -bottom-10 -right-16 w-72 opacity-[0.12]" />
          <h2 className="relative text-2xl font-bold">A good report includes</h2>
          <ul className="relative mt-6 space-y-5">
            {TIPS[type].map(([Icon, title, text]) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-amber">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-[#d3dcea]">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
