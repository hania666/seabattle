/**
 * Bomb projectile that arcs from above onto a target cell, then fires a
 * 3×3 explosion. Absolutely positioned over a `BoardGrid`; the caller
 * locates the target cell via a grid element so the overlay lines up.
 *
 * Usage: mount with a fresh `target` + `ts` key each time a bomb is
 * launched. Unmount after ~900ms (the animation duration) — the parent
 * is expected to manage that timer.
 */

import { useEffect, useState } from "react";
import { BOARD_SIZE } from "../../lib/game/types";

interface Props {
  row: number;
  col: number;
}

export function BombArc({ row, col }: Props) {
  const [phase, setPhase] = useState<"falling" | "exploding">("falling");

  useEffect(() => {
    const t = setTimeout(() => setPhase("exploding"), 600);
    return () => clearTimeout(t);
  }, []);

  const cellPct = 100 / BOARD_SIZE;
  const left = `calc(${col * cellPct}% + ${cellPct / 2}%)`;
  const top = `calc(${row * cellPct}% + ${cellPct / 2}%)`;

  return (
    <div className="pointer-events-none absolute inset-0 z-40" aria-hidden>
      {phase === "falling" && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-bomb-arc"
          style={{ left, top }}
        >
          <span className="block h-4 w-4 rounded-full bg-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-gold-400" />
          <span className="absolute left-1/2 top-[-8px] block h-3 w-1 -translate-x-1/2 rounded-full bg-gold-300" />
        </span>
      )}
      {phase === "exploding" && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left, top }}
        >
          <span
            className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-yellow-100 via-orange-500 to-red-700 animate-shot-burst"
            style={{ animationDuration: "0.5s" }}
          />
          <span
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-orange-300/70 animate-shot-ripple"
            style={{ animationDuration: "0.7s" }}
          />
        </span>
      )}
    </div>
  );
}
