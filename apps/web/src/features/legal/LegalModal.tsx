/**
 * Read-only viewer for a LegalDocument. Used from the footer when the user
 * clicks "Terms" or "Privacy" at any point.
 */

import { useEffect } from "react";
import type { LegalDocument } from "./content";
import { useT } from "../../lib/i18n";

type Props = {
  open: boolean;
  doc: LegalDocument | null;
  onClose: () => void;
};

export function LegalModal({ open, doc, onClose }: Props) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-sea-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-sea-700/60 bg-sea-950 shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-sea-800/60 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-sea-50">
              {doc.title}
            </h2>
            <p className="mt-0.5 text-xs text-sea-300">{doc.effectiveDate}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="rounded-full bg-sea-900/60 p-2 text-sea-200 ring-1 ring-sea-700/60 hover:bg-sea-800/80 hover:text-sea-100"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 text-sm leading-relaxed text-sea-100">
          <div className="space-y-5">
            {doc.sections.map((s) => (
              <section key={s.title}>
                <h3 className="font-display text-base font-semibold text-sea-50">
                  {s.title}
                </h3>
                <div className="mt-2 space-y-2 text-sea-200">
                  {s.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
