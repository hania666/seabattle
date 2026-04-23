import { BOARD_SIZE, type Board, type CellState } from "../../lib/game/types";
import type { ShotRecord } from "../../lib/pvp/state";

/** Build an attack-view board showing only the shots we've fired. */
export function buildEnemyBoard(shots: ShotRecord[]): Board {
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

/** Overlay the opponent's shots on our own board so we can see where we're being hit. */
export function applyOpponentShots(board: Board, shots: ShotRecord[]): Board {
  const cells: CellState[][] = board.cells.map((row) => row.slice());
  for (const shot of shots) {
    const [r, c] = shot.coord;
    if (shot.outcome === "miss") {
      cells[r][c] = { kind: "miss" };
    } else if (shot.outcome === "hit") {
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
  return { ships: board.ships, cells };
}

/** Count distinct ships we have sunk (by counting "sunk" outcomes in our fire log). */
export function countDistinctSunk(shots: ShotRecord[]): number {
  return shots.filter((s) => s.outcome === "sunk").length;
}

/** Count how many of our own ships have been fully sunk by the opponent. */
export function countOwnShipsSunk(board: Board): number {
  const sunkShipIds = new Set<string>();
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.kind === "sunk") sunkShipIds.add(cell.shipId);
    }
  }
  return sunkShipIds.size;
}
