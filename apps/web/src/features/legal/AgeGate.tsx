/**
 * Age + ToS + Privacy gate. Shown as a full-screen blocking modal on first
 * visit; click-through persists the consent in localStorage.
 */

import { useState } from "react";
import { useT } from "../../lib/i18n";
import { acceptConsent } from "../../lib/legal";
import { TERMS, PRIVACY } from "./content";
import { LegalModal } from "./LegalModal";
import { useLang } from "../../lib/i18n";

type Props = {
  onAccepted: () => void;
};

export function AgeGate({ onAccepted }: Props) {
  const t = useT();
  const lang = useLang();
  const [age, setAge] = useState(false);
  const [tos, setTos] = useState(false);
  const [viewer, setViewer] = useState<"tos" | "privacy" | null>(null);

  const canAccept = age && tos;

  function onAccept() {
    if (!canAccept) return;
    acceptConsent();
    onAccepted();
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("legal.gate.title")}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-sea-950/95 p-4 backdrop-blur"
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-sea-700/60 bg-sea-950 shadow-2xl">
          <div className="bg-gradient-to-br from-sea-900/80 via-sea-950 to-sea-950 px-6 py-5">
            <h2 className="font-display text-2xl font-bold text-sea-50">
              {t("legal.gate.title")}
            </h2>
            <p className="mt-1 text-sm text-sea-300">{t("legal.gate.subtitle")}</p>
          </div>
          <div className="space-y-4 px-6 py-5 text-sm text-sea-200">
            <p>{t("legal.gate.intro")}</p>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-sea-900/50 p-3 ring-1 ring-sea-800/60 hover:bg-sea-900/80">
              <input
                type="checkbox"
                checked={age}
                onChange={(e) => setAge(e.target.checked)}
                className="mt-1 h-4 w-4 accent-gold-400"
                data-testid="age-checkbox"
              />
              <span className="text-sea-100">{t("legal.gate.age.check")}</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-sea-900/50 p-3 ring-1 ring-sea-800/60 hover:bg-sea-900/80">
              <input
                type="checkbox"
                checked={tos}
                onChange={(e) => setTos(e.target.checked)}
                className="mt-1 h-4 w-4 accent-gold-400"
                data-testid="tos-checkbox"
              />
              <span className="text-sea-100">
                {t("legal.gate.tos.before")}{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setViewer("tos");
                  }}
                  className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
                >
                  {t("legal.gate.tos.link")}
                </button>{" "}
                {t("legal.gate.and")}{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setViewer("privacy");
                  }}
                  className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
                >
                  {t("legal.gate.privacy.link")}
                </button>
                .
              </span>
            </label>

            <p className="text-xs text-sea-400">{t("legal.gate.disclaimer")}</p>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-sea-800/60 bg-sea-950 px-6 py-4">
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sea-400 underline underline-offset-2 hover:text-sea-200"
            >
              {t("legal.gate.help")}
            </a>
            <button
              type="button"
              onClick={onAccept}
              disabled={!canAccept}
              data-testid="age-gate-accept"
              className="rounded-lg bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 px-5 py-2 text-sm font-bold uppercase tracking-wide text-sea-950 shadow-glow-gold transition hover:shadow-[0_0_32px_rgba(250,204,21,0.55)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {t("legal.gate.accept")}
            </button>
          </div>
        </div>
      </div>
      <LegalModal
        open={viewer !== null}
        doc={viewer === "tos" ? TERMS[lang] : viewer === "privacy" ? PRIVACY[lang] : null}
        onClose={() => setViewer(null)}
      />
    </>
  );
}
