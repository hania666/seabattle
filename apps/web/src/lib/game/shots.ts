import { BOARD_SIZE, type Board, type CellState, type Coord } from "./types";

export interface ShotResult {
  board: Board;
  outcome: "miss" | "hit" | "sunk" | "already";
  /** set when outcome === "sunk" */
  sunkShipCells?: Coord[];
  allSunk: boolean;
}

export function fireShot(board: Board, row: number, col: number): ShotResult {
  const cell = board.cells[row][col];
  if (cell.kind === "miss" || cell.kind === "hit" || cell.kind === "sunk") {
    return { board, outcome: "already", allSunk: allShipsSunk(board) };
  }

  const nextCells: CellState[][] = board.cells.map((r) => r.slice());
  const nextShips = board.ships.map((s) => ({ ...s, hits: s.hits.slice() }));

  if (cell.kind === "empty") {
    nextCells[row][col] = { kind: "miss" };
    return {
      board: { ships: nextShips, cells: nextCells },
      outcome: "miss",
      allSunk: allShipsSunk({ ships: nextShips, cells: nextCells }),
    };
  }

  // Hit a ship cell.
  const ship = nextShips.find((s) => s.id === cell.shipId);
  if (!ship) throw new Error(`inconsistent board: no ship ${cell.shipId}`);
  const hitIndex = ship.cells.findIndex(([r, c]) => r === row && c === col);
  ship.hits[hitIndex] = true;

  const sunk = ship.hits.every(Boolean);
  if (sunk) {
    for (const [r, c] of ship.cells) {
      nextCells[r][c] = { kind: "sunk", shipId: ship.id };
    }
  } else {
    nextCells[row][col] = { kind: "hit", shipId: ship.id };
  }

  const board2: Board = { ships: nextShips, cells: nextCells };
  return {
    board: board2,
    outcome: sunk ? "sunk" : "hit",
    sunkShipCells: sunk ? ship.cells : undefined,
    allSunk: allShipsSunk(board2),
  };
}

export function allShipsSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.hits.every(Boolean));
}

/** All cells that haven't been fired at yet. */
export function openCells(board: Board): Coord[] {
  const out: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board.cells[r][c];
      if (cell.kind === "empty" || (cell.kind === "ship" && cell.revealed)) out.push([r, c]);
    }
  }
  return out;
}

/**
 * Returns a view of the opponent's board with ships hidden (unless sunk), for
 * rendering to the attacker.
 */
export function publicView(board: Board): Board {
  const cells: CellState[][] = board.cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === "ship") return { kind: "empty" } as CellState;
      return cell;
    }),
  );
  return { ships: board.ships, cells };
}
