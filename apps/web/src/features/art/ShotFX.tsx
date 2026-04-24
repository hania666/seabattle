/**
 * One-shot visual effects rendered over a board cell right after a shot
 * resolves. Positioned absolutely via `inset-0` and intended to sit inside
 * the cell container. All animations are CSS keyframes defined in
 * tailwind.config.js — no JS tweening, no heavy deps.
 *
 *  - `outcome="miss"` → blue ripple + water spray droplets
 *  - `outcome="hit"`  → orange shockwave + radial burst + debris specks
 *  - `outcome="sunk"` → hit effect stacked with a red heavy flash
 *
 * The caller must change the React `key` to retrigger the animation
 * (typical pattern: `key={ts}` where `ts` is the shot timestamp).
 */

import type { CSSProperties } from "react";

export type ShotOutcome = "miss" | "hit" | "sunk";

interface Props {
  outcome: ShotOutcome;
}

// Distinct directions around the cell so sprays/debris look organic
// instead of radially symmetric. Values are the final translate offsets.
const SPRAY_DIRS: ReadonlyArray<[string, string]> = [
  ["-140%", "-120%"],
  ["140%", "-130%"],
  ["-160%", "40%"],
  ["150%", "60%"],
  ["-10%", "-180%"],
  ["20%", "170%"],
];

const DEBRIS_DIRS: ReadonlyArray<[string, string]> = [
  ["-120%", "-80%"],
  ["110%", "-100%"],
  ["-70%", "140%"],
  ["130%", "90%"],
];

export function ShotFX({ outcome }: Props) {
  const isMiss = outcome === "miss";
  const isSunk = outcome === "sunk";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
      aria-hidden
    >
      {/* Expanding ring — colour depends on outcome */}
      <span
        className={`absolute inset-0 rounded-full animate-shot-ripple ${
          isMiss
            ? "bg-sea-300/50 ring-2 ring-sea-200/80"
            : "bg-orange-400/40 ring-2 ring-orange-300/80"
        }`}
      />

      {/* Central burst — orange flash for hits, thin splash core for miss */}
      <span
        className={`absolute inset-[15%] rounded-full animate-shot-burst ${
          isMiss
            ? "bg-gradient-to-br from-sea-200/60 to-sea-500/30"
            : isSunk
              ? "bg-gradient-to-br from-yellow-200 via-orange-500 to-red-700"
              : "bg-gradient-to-br from-yellow-200 via-orange-400 to-red-500"
        }`}
      />

      {/* Secondary red flash for sinks */}
      {isSunk && (
        <span className="absolute inset-[20%] rounded-full bg-red-500/70 animate-shot-burst [animation-delay:120ms]" />
      )}

      {/* Particles: blue spray droplets for miss, dark debris specks for hit */}
      {(isMiss ? SPRAY_DIRS : DEBRIS_DIRS).map(([x, y], i) => (
        <span
          key={i}
          className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            isMiss
              ? "bg-sea-100 animate-shot-spray"
              : "bg-slate-900 animate-shot-debris"
          }`}
          style={{ "--fx-to": `translate(${x}, ${y})` } as CSSProperties}
        />
      ))}
    </div>
  );
}
