import { useSyncExternalStore } from "react";
import { useT } from "../lib/i18n";

/**
 * Closed-beta strip rendered immediately below the header. It carries two
 * signals at once:
 *
 *  1. A non-dismissable "BETA · TESTNET" pill so first-time visitors instantly
 *     understand this is a closed-beta build running on Abstract Sepolia and
 *     that no real funds are involved.
 *  2. An optional "Not real money" copy line that the user can dismiss; once
 *     dismissed it stays hidden for that browser (localStorage flag).
 *
 * The strip is intentionally a separate element from the header so it can be
 * sticky/scroll-pinned alongside the header without competing for space with
 * the language picker, shop button, etc.
 */

const LS_KEY = "seabattle:beta-copy-dismissed:v1";

const subscribers = new Set<() => void>();
// In-memory fallback for environments where localStorage throws (Safari
// private mode, third-party-cookie blockers, sandboxed iframes). Without
// this the dismiss button would silently no-op for those users — they'd
// click × and the copy would stay visible forever.
let memoryDismissed = false;

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(LS_KEY) === "1") return true;
  } catch {
    /* fall through to in-memory flag */
  }
  return memoryDismissed;
}

function emit() {
  for (const fn of subscribers) fn();
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function useBetaDismissed(): [boolean, () => void] {
  const dismissed = useSyncExternalStore(
    subscribe,
    readDismissed,
    () => false,
  );
  const dismiss = () => {
    try {
      window.localStorage.setItem(LS_KEY, "1");
    } catch {
      // localStorage may be disabled (private mode) — fall back to the
      // module-level flag that readDismissed() also consults so the dismiss
      // sticks for the remainder of the page session even without storage.
      memoryDismissed = true;
    }
    emit();
  };
  return [dismissed, dismiss];
}

export function BetaBanner(): JSX.Element {
  const t = useT();
  const [dismissed, dismiss] = useBetaDismissed();

  return (
    <div
      role="status"
      aria-label={t("beta.banner.aria")}
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-100 sm:px-6"
      data-testid="beta-banner"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 ring-1 ring-amber-400/60">
            <span aria-hidden>🧪</span>
            {t("beta.badge")}
          </span>
          {!dismissed && (
            <span className="truncate text-amber-100/80">
              {t("beta.copy")}
            </span>
          )}
        </div>
        {!dismissed && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("beta.dismiss.aria")}
            className="shrink-0 rounded px-1.5 py-0.5 text-amber-200/70 hover:bg-amber-500/20 hover:text-amber-100"
            data-testid="beta-banner-dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
