import { BOARD_SIZE, type Board, type CellState, type Coord } from "../../lib/game/types";
import type { ShotRecord } from "../../lib/pvp/state";
import { BoardGrid } from "../pve/BoardGrid";

interface Props {
  ownBoard: Board;
  ownShots: ShotRecord[]; // shots I've fired at opponent
  opponentShots: ShotRecord[]; // shots opponent has fired at me
  canFire: boolean;
  onFire: (row: number, col: number) => void;
  turnLabel: string;
}

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div
        className={`mx-auto inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
          canFire ? "bg-sea-300 text-sea-950" : "bg-sea-800 text-sea-200"
        }`}
        data-testid="pvp-turn-indicator"
      >
        {turnLabel}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 font-display text-lg text-sea-100">Enemy waters</h3>
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
          <h3 className="mb-3 font-display text-lg text-sea-100">Your fleet</h3>
          <BoardGrid board={playerBoardWithOpponentShots} mode="own" disabled data-testid="pvp-board-own" />
          <p className="mt-2 text-xs text-sea-400">Opponent shots: {opponentShots.length}</p>
        </section>
      </div>
    </div>
  );
}

/** Build an empty attack-view board showing only the shots we've fired. */
function buildEnemyBoard(shots: ShotRecord[]): Board {
  const cells: CellState[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ kind: "empty" }) as CellState),
  );
  for (const shot of shots) {
    const [r, c] = shot.coord;
    if (shot.outcome === "miss") cells[r][c] = { kind: "miss" };
    else if (shot.outcome === "hit") cells[r][c] = { kind: "hit", shipId: "enemy" };
    else if (shot.outcome === "sunk") {
      if (shot.sunkShipCells) {
        for (const [sr, sc] of shot.sunkShipCells) {
          cells[sr][sc] = { kind: "sunk", shipId: "enemy" };
        }
      } else {
        // Defensive: the server normally supplies sunkShipCells, but if the
        // payload is missing fall back to marking the targeted cell as hit so
        // the player still gets visual feedback.
        cells[r][c] = { kind: "hit", shipId: "enemy" };
      }
    }
  }
  return { ships: [], cells };
}

/**
 * Overlay the opponent's shots on our own board so we can see where we're
 * being hit.
 */
function applyOpponentShots(board: Board, shots: ShotRecord[]): Board {
  const cells: CellState[][] = board.cells.map((row) => row.slice());
  for (const shot of shots) {
    const [r, c] = shot.coord;
    if (shot.outcome === "miss") cells[r][c] = { kind: "miss" };
    else if (shot.outcome === "hit") {
      const under = cells[r][c];
      const shipId = under.kind === "ship" ? under.shipId : "own";
      cells[r][c] = { kind: "hit", shipId };
    } else if (shot.outcome === "sunk") {
      const targets = shot.sunkShipCells ?? [shot.coord];
      for (const [sr, sc] of targets) {
        const under = cells[sr][sc];
        const shipId = under.kind === "ship" ? under.shipId : "own";
        cells[sr][sc] = { kind: "sunk", shipId };
      }
    }
  }
  // Ensure Coord type not stripped by TS
  const _unused: Coord | undefined = undefined;
  void _unused;
  return { ships: board.ships, cells };
}
