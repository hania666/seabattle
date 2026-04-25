/**
 * Full-screen notice shown when the visitor's inferred country/state is on
 * the restricted list. The rest of the app is not mounted.
 */

import { useT } from "../../lib/i18n";
import type { BlockReason } from "../../lib/geo";

type Props = {
  reason: BlockReason;
};

export function GeoBlock({ reason }: Props) {
  const t = useT();

  const title =
    reason.reason === "sanctioned"
      ? t("legal.geo.sanctioned.title")
      : reason.reason === "prohibited_country"
        ? t("legal.geo.country.title")
        : t("legal.geo.state.title");

  const detail =
    reason.reason === "prohibited_state"
      ? `${reason.country} / ${reason.region ?? "?"}`
      : reason.country;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-sea-950 p-4"
    >
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/40">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-400" aria-hidden>
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-sea-50">{title}</h1>
        <p className="mt-3 text-sm text-sea-200">{t("legal.geo.body")}</p>
        <p className="mt-4 font-mono text-xs text-sea-400">
          {t("legal.geo.detected")}: <span className="text-sea-200">{detail}</span>
        </p>
        <p className="mt-6 text-xs text-sea-500">{t("legal.geo.disclaimer")}</p>
      </div>
    </div>
  );
}
