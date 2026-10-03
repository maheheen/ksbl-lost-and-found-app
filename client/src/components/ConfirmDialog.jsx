// "Are you sure?" dialog built on the native <dialog> element, which gives us a
// keyboard focus trap, Escape-to-close and correct screen-reader roles for free.
import { useEffect, useRef } from "react";
import { btn } from "./ui";

export default function ConfirmDialog({ open, title, children, confirmLabel, tone = "primary", busy, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault(); // we close it ourselves through the `open` prop
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel(); // click on the dark backdrop
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-line bg-white p-0 text-ink shadow-float"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-xl font-bold">
          {title}
        </h2>
        <div className="mt-2 text-muted">{children}</div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {/* Cancel comes first in the DOM so keyboard focus starts on the safe choice */}
          <button type="button" onClick={onCancel} disabled={busy} className={btn("outline")}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={btn(tone === "danger" ? "danger" : "primary")}>
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
