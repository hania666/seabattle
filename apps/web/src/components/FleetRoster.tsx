import type { Board, ShipKind } from "../lib/game/types";
import { useT } from "../lib/i18n";

type Side = "self" | "enemy";

interface Props {
  board: Board;
  side: Side;
  /**
   * Whether the roster belongs to the opponent. Enemy ship positions are
   * secret until sunk, so intact ships show as silhouettes and only sunk
   * ships reveal their identity. Self-side always reveals (it's your own).
   */
  revealOnlyWhenSunk?: boolean;
}

/**
 * Compact ship-roster panel. For each ship type, render one row:
 *   [ icon ]  Name · size · status (afloat / damaged / sunk)
 *
 * When `revealOnlyWhenSunk` is true, non-sunk slots render as a dimmed
 * silhouette with a "?" instead of the actual ship kind.
 */
export function FleetRoster({ board, side, revealOnlyWhenSunk }: Props) {
  const t = useT();
  const ships = board.ships.map((s) => {
    const hits = s.hits.filter(Boolean).length;
    const sunk = hits === s.hits.length;
    const damaged = hits > 0 && !sunk;
    return {
      id: s.id,
      kind: s.kind,
      size: s.hits.length,
      sunk,
      damaged,
      hits,
    };
  });

  const afloat = ships.filter((s) => !s.sunk).length;
  const total = ships.length;

  return (
    <div className="w-full rounded-2xl border border-sea-800/70 bg-sea-950/50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-[0.2em] text-sea-300">
          {side === "self" ? t("fleet.your") : t("fleet.enemy")}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${
            afloat === 0
              ? "bg-coral-500/20 text-coral-200 ring-coral-400/50"
              : "bg-sea-900/70 text-sea-100 ring-sea-600/60"
          }`}
        >
          {t("fleet.afloat")} {afloat}/{total}
        </span>
      </div>
      <ul className="space-y-1.5">
        {ships.map((s) => {
          const hide = revealOnlyWhenSunk && !s.sunk;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${
                s.sunk
                  ? "bg-coral-500/15 ring-1 ring-coral-400/40"
                  : s.damaged
                    ? "bg-gold-500/10 ring-1 ring-gold-400/30"
                    : "bg-sea-900/40"
              }`}
            >
              <ShipIcon
                size={s.size}
                kind={hide ? "unknown" : s.kind}
                state={s.sunk ? "sunk" : s.damaged ? "damaged" : "afloat"}
              />
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    s.sunk
                      ? "text-coral-200 line-through"
                      : s.damaged
                        ? "text-gold-200"
                        : "text-sea-100"
                  }`}
                >
                  {hide ? "???" : shipLabel(t, s.kind)}
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  {Array.from({ length: s.size }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-2 rounded-sm ${
                        i < s.hits ? "bg-coral-400" : "bg-sea-600/80"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span
                className={`font-mono text-[10px] uppercase ${
                  s.sunk
                    ? "text-coral-300"
                    : s.damaged
                      ? "text-gold-300"
                      : "text-sea-400"
                }`}
              >
                {s.sunk
                  ? t("fleet.sunk")
                  : s.damaged
                    ? t("fleet.damaged")
                    : `${s.size}×`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function shipLabel(t: (k: string) => string, kind: ShipKind): string {
  switch (kind) {
    case "carrier":
      return t("ship.carrier");
    case "battleship":
      return t("ship.battleship");
    case "cruiser":
      return t("ship.cruiser");
    case "submarine":
      return t("ship.submarine");
    case "destroyer":
      return t("ship.destroyer");
  }
}

function ShipIcon({
  size,
  kind,
  state,
}: {
  size: number;
  kind: ShipKind | "unknown";
  state: "afloat" | "damaged" | "sunk";
}) {
  const stateTone =
    state === "sunk"
      ? "text-coral-400 opacity-60"
      : state === "damaged"
        ? "text-gold-300"
        : kind === "unknown"
          ? "text-sea-600"
          : "text-sea-300";
  const width = 14 + size * 8;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} 18`}
      width={width}
      height={18}
      className={`shrink-0 ${stateTone}`}
    >
      {/* Hull */}
      <path
        d={`M2 12 Q6 15 ${width / 2} 15 Q${width - 6} 15 ${width - 2} 12 L${width - 4} 7 L4 7 Z`}
        fill="currentColor"
      />
      {kind === "unknown" ? (
        <text
          x={width / 2}
          y="13"
          textAnchor="middle"
          fontSize="8"
          fontWeight="bold"
          fill="#0f172a"
        >
          ?
        </text>
      ) : (
        <>
          {/* Deck detail by ship kind */}
          {kind === "carrier" && (
            <rect x={width / 3} y="3" width={width / 3} height="4" rx="1" fill="currentColor" />
          )}
          {kind === "battleship" && (
            <>
              <rect
                x={width / 2 - 3}
                y="2"
                width="6"
                height="5"
                rx="1"
                fill="currentColor"
              />
              <rect x="4" y="9" width="2" height="1" fill="#0f172a" />
            </>
          )}
          {kind === "cruiser" && (
            <rect x={width / 2 - 2} y="3" width="4" height="4" fill="currentColor" />
          )}
          {kind === "submarine" && (
            <>
              <ellipse cx={width / 2} cy="10" rx={width / 2 - 2} ry="3" fill="currentColor" />
              <rect x={width / 2 - 2} y="5" width="4" height="3" fill="currentColor" />
              <line
                x1={width / 2}
                y1="2"
                x2={width / 2}
                y2="5"
                stroke="currentColor"
                strokeWidth="1"
              />
            </>
          )}
          {kind === "destroyer" && (
            <rect x={width / 2 - 1} y="4" width="2" height="3" fill="currentColor" />
          )}
        </>
      )}
      {/* State overlay */}
      {state === "sunk" && (
        <line x1="2" y1="2" x2={width - 2} y2="16" stroke="#fb7185" strokeWidth="1.5" />
      )}
    </svg>
  );
}
