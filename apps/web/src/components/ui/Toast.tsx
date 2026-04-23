import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ToastContext, type Toast } from "./toast-context";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((xs) => xs.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast: Toast = { id, ...t };
      setToasts((xs) => [...xs, toast]);
      const ttl = t.tone === "error" ? 8_000 : 5_000;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ttl),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastLayer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
            t.tone === "error"
              ? "border-red-500/40 bg-red-950/80 text-red-100"
              : t.tone === "success"
                ? "border-sea-400/40 bg-sea-800/90 text-sea-50"
                : "border-sea-700/60 bg-sea-900/90 text-sea-100",
          ].join(" ")}
          data-testid={`toast-${t.tone}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {t.title && <div className="font-semibold">{t.title}</div>}
              <div className="text-xs leading-relaxed text-sea-100/90">{t.message}</div>
            </div>
            <button
              type="button"
              className="text-sea-300 hover:text-sea-100"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
