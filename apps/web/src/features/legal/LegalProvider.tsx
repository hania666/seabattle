/**
 * Top-level gate: resolves geo → if blocked, renders <GeoBlock/>; otherwise
 * resolves the user's consent status and gates the app behind <AgeGate/> if
 * they haven't accepted.
 *
 * Kept as a thin shell around children so the existing App tree stays
 * untouched when consent is already recorded.
 */

import { useEffect, useState, type ReactNode } from "react";
import { evaluateBlock, lookupGeo, type BlockReason } from "../../lib/geo";
import { hasConsent, useConsent } from "../../lib/legal";
import { AgeGate } from "./AgeGate";
import { GeoBlock } from "./GeoBlock";

type Status = "loading" | "blocked" | "ready";

type Props = {
  children: ReactNode;
};

export function LegalProvider({ children }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [block, setBlock] = useState<BlockReason | null>(null);
  // Subscribe to consent store so accept triggers re-render.
  useConsent();

  useEffect(() => {
    const ctrl = new AbortController();
    lookupGeo(ctrl.signal).then((geo) => {
      const reason = evaluateBlock(geo);
      if (reason) {
        setBlock(reason);
        setStatus("blocked");
      } else {
        setStatus("ready");
      }
    });
    return () => ctrl.abort();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sea-950 text-sea-300">
        <div className="flex items-center gap-3 text-sm">
          <span className="h-2 w-2 animate-ping rounded-full bg-sea-300" />
          Loading…
        </div>
      </div>
    );
  }

  if (status === "blocked" && block) {
    return <GeoBlock reason={block} />;
  }

  if (!hasConsent()) {
    // AgeGate writes to the consent store on accept; useConsent subscription
    // above will trigger a re-render and this branch will unmount.
    return <AgeGate onAccepted={() => {}} />;
  }

  return <>{children}</>;
}
