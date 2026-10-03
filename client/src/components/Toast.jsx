// Short confirmation messages ("Report saved."). Announced politely to screen readers.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((message, kind = "success") => {
    clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Sits above the mobile bottom nav (bottom-24) and lower on desktop */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
        {toast && (
          <div
            key={toast.id}
            className={`toast-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-float ${
              toast.kind === "error" ? "bg-danger" : "bg-navy"
            }`}
          >
            {toast.kind === "error" ? (
              <TriangleAlert size={22} aria-hidden="true" />
            ) : (
              <CircleCheck size={22} className="text-amber" aria-hidden="true" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-white/10"
              aria-label="Dismiss message"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
