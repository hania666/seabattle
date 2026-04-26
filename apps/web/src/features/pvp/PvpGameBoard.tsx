import { useEffect, useRef, useState } from "react";
import { FLEET, type Board } from "../../lib/game/types";
import type { ShotRecord } from "../../lib/pvp/state";
import { BoardGrid, type CellFx } from "../pve/BoardGrid";
import { FleetRoster } from "../../components/FleetRoster";
import { useT } from "../../lib/i18n";
import {
  applyOpponentShots,
  buildEnemyBoard,
  countDistinctSunk,
  countOwnShipsSunk,
} from "./boardBuilders";

const FX_LIFETIME_MS = 900;

/**
 * Derive one-shot FX entries whenever a new shot record is appended to a
 * shots list. Each entry is pruned after `FX_LIFETIME_MS` so the animation
 * plays exactly once.
 */
function useShotFx(shots: ShotRecord[]): CellFx[] {
  const prevLen = useRef(shots.length);
  const [fx, setFx] = useState<CellFx[]>([]);

  useEffect(() => {
    if (shots.length > prevLen.current) {
      const now = Date.now();
      const added = shots.slice(prevLen.current).map((s, i) => ({
        row: s.coord[0],
        col: s.coord[1],
        outcome: s.outcome,
        // i disambiguates the React key when several shots are folded in
        // on the same render tick; cleanup uses ts only and tolerates a
        // sub-millisecond skew.
        ts: now + i,
      }));
      setFx((xs) => [...xs, ...added]);
    }
    prevLen.current = shots.length;
  }, [shots]);

  useEffect(() => {
    if (fx.length === 0) return;
    const tm = setTimeout(() => {
      const cutoff = Date.now() - FX_LIFETIME_MS;
      setFx((xs) => xs.filter((f) => f.ts > cutoff));
    }, FX_LIFETIME_MS);
    return () => clearTimeout(tm);
  }, [fx]);

  return fx;
}

interface Props {
  ownBoard: Board;
  ownShots: ShotRecord[]; // shots I've fired at opponent
  opponentShots: ShotRecord[]; // shots opponent has fired at me
  canFire: boolean;
  onFire: (row: number, col: number) => void;
  turnLabel: string;
}

const TOTAL_SHIPS = FLEET.length;

export function PvpGameBoard({
  ownBoard,
  ownShots,
  opponentShots,
  canFire,
  onFire,
  turnLabel,
}: Props) {
  const t = useT();
  const enemyBoard = buildEnemyBoard(ownShots);
  const playerBoardWithOpponentShots = applyOpponentShots(ownBoard, opponentShots);

  const enemySunk = countDistinctSunk(ownShots);
  const ownSunk = countOwnShipsSunk(playerBoardWithOpponentShots);

  const enemyFx = useShotFx(ownShots);
  const ownFx = useShotFx(opponentShots);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div
        className={`mx-auto inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
          canFire
            ? "bg-sea-300 text-sea-950 shadow-[0_0_18px_rgba(56,189,248,0.5)]"
            : "bg-sea-800 text-sea-200"
        }`}
        data-testid="pvp-turn-indicator"
      >
        {turnLabel}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Enemy waters</h3>
            <ShipsBadge remaining={TOTAL_SHIPS - enemySunk} total={TOTAL_SHIPS} label={t("fleet.afloat")} />
          </div>
          <BoardGrid
            board={enemyBoard}
            mode="attack"
            onCellClick={onFire}
            disabled={!canFire}
            fx={enemyFx}
            data-testid="pvp-board-enemy"
          />
          <p className="mt-2 text-xs text-sea-400">Your shots: {ownShots.length}</p>
        </section>

        <aside className="space-y-4">
          <FleetRoster board={enemyBoard} side="enemy" revealOnlyWhenSunk />
          <FleetRoster board={playerBoardWithOpponentShots} side="self" />
        </aside>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-sea-100">Your fleet</h3>
          <ShipsBadge remaining={TOTAL_SHIPS - ownSunk} total={TOTAL_SHIPS} label={t("fleet.afloat")} />
        </div>
        <BoardGrid
          board={playerBoardWithOpponentShots}
          mode="own"
          disabled
          fx={ownFx}
          data-testid="pvp-board-own"
        />
        <p className="mt-2 text-xs text-sea-400">Opponent shots: {opponentShots.length}</p>
      </section>
    </div>
  );
}

function ShipsBadge({
  remaining,
  total,
  label,
}: {
  remaining: number;
  total: number;
  label: string;
}) {
  return (
    <span className="rounded-full border border-sea-700/60 bg-sea-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-sea-200">
      {label}: <span className="text-sea-50">{remaining}</span>/{total}
    </span>
  );
}
