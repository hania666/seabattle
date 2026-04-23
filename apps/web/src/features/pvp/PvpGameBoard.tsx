import { FLEET, type Board } from "../../lib/game/types";
import type { ShotRecord } from "../../lib/pvp/state";
import { BoardGrid } from "../pve/BoardGrid";
import {
  applyOpponentShots,
  buildEnemyBoard,
  countDistinctSunk,
  countOwnShipsSunk,
} from "./boardBuilders";

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
  const enemyBoard = buildEnemyBoard(ownShots);
  const playerBoardWithOpponentShots = applyOpponentShots(ownBoard, opponentShots);

  const enemySunk = countDistinctSunk(ownShots);
  const ownSunk = countOwnShipsSunk(playerBoardWithOpponentShots);

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

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Enemy waters</h3>
            <ShipsBadge remaining={TOTAL_SHIPS - enemySunk} total={TOTAL_SHIPS} />
          </div>
          <BoardGrid
            board={enemyBoard}
            mode="attack"
            onCellClick={onFire}
            disabled={!canFire}
            data-testid="pvp-board-enemy"
          />
          <p className="mt-2 text-xs text-sea-400">Your shots: {ownShots.length}</p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Your fleet</h3>
            <ShipsBadge remaining={TOTAL_SHIPS - ownSunk} total={TOTAL_SHIPS} />
          </div>
          <BoardGrid
            board={playerBoardWithOpponentShots}
            mode="own"
            disabled
            data-testid="pvp-board-own"
          />
          <p className="mt-2 text-xs text-sea-400">Opponent shots: {opponentShots.length}</p>
        </section>
      </div>
    </div>
  );
}

function ShipsBadge({ remaining, total }: { remaining: number; total: number }) {
  return (
    <span className="rounded-full border border-sea-700/60 bg-sea-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-sea-200">
      Afloat: <span className="text-sea-50">{remaining}</span>/{total}
    </span>
  );
}
