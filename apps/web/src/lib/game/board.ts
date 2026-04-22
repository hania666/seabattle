import {
  BOARD_SIZE,
  FLEET,
  type Board,
  type CellState,
  type Coord,
  type Orientation,
  type PlacedShip,
  type ShipKind,
} from "./types";

export function createEmptyBoard(): Board {
  const cells: CellState[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ kind: "empty" }) as CellState),
  );
  return { ships: [], cells };
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function shipCells(row: number, col: number, size: number, orientation: Orientation): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < size; i++) {
    if (orientation === "horizontal") cells.push([row, col + i]);
    else cells.push([row + i, col]);
  }
  return cells;
}

/**
 * A placement is valid when every cell is in bounds, the cells themselves are
 * empty, and no neighbor (8-directional) already contains another ship.
 */
export function canPlaceShip(board: Board, cells: Coord[]): boolean {
  for (const [r, c] of cells) {
    if (!inBounds(r, c)) return false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const cell = board.cells[nr][nc];
        if (cell.kind === "ship") return false;
      }
    }
  }
  return true;
}

export function placeShip(board: Board, kind: ShipKind, cells: Coord[]): Board {
  const id = `${kind}-${board.ships.length}`;
  const size = cells.length;
  const ship: PlacedShip = {
    id,
    kind,
    size,
    cells: cells.map(([r, c]) => [r, c] as Coord),
    hits: Array.from({ length: size }, () => false),
  };
  const cellsCopy: CellState[][] = board.cells.map((row) => row.slice());
  for (const [r, c] of cells) {
    cellsCopy[r][c] = { kind: "ship", shipId: id, revealed: true };
  }
  return { ships: [...board.ships, ship], cells: cellsCopy };
}

/** Generate a randomly-placed fleet. Guaranteed to succeed. */
export function randomFleet(random: () => number = Math.random): Board {
  // Retry loop — 10×10 with standard fleet always has room, typically in a
  // single attempt.
  for (let attempt = 0; attempt < 50; attempt++) {
    let board = createEmptyBoard();
    let success = true;
    for (const spec of FLEET) {
      const placed = tryPlaceRandom(board, spec.kind, spec.size, random);
      if (!placed) {
        success = false;
        break;
      }
      board = placed;
    }
    if (success) return board;
  }
  throw new Error("unable to place fleet");
}

function tryPlaceRandom(
  board: Board,
  kind: ShipKind,
  size: number,
  random: () => number,
): Board | null {
  const attempts: [number, number, Orientation][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      attempts.push([r, c, "horizontal"], [r, c, "vertical"]);
    }
  }
  // Fisher–Yates shuffle
  for (let i = attempts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
  }
  for (const [r, c, orient] of attempts) {
    const cells = shipCells(r, c, size, orient);
    if (canPlaceShip(board, cells)) {
      return placeShip(board, kind, cells);
    }
  }
  return null;
}

/** All ships placed for a standard fleet? */
export function isFleetComplete(board: Board): boolean {
  if (board.ships.length !== FLEET.length) return false;
  const counts = new Map<ShipKind, number>();
  for (const ship of board.ships) {
    counts.set(ship.kind, (counts.get(ship.kind) ?? 0) + 1);
  }
  for (const spec of FLEET) {
    if ((counts.get(spec.kind) ?? 0) < 1) return false;
  }
  return true;
}
