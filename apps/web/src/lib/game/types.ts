export const BOARD_SIZE = 10;

export type Orientation = "horizontal" | "vertical";

export type ShipKind = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export interface ShipSpec {
  kind: ShipKind;
  size: number;
  label: string;
}

export const FLEET: readonly ShipSpec[] = [
  { kind: "carrier", size: 5, label: "Carrier" },
  { kind: "battleship", size: 4, label: "Battleship" },
  { kind: "cruiser", size: 3, label: "Cruiser" },
  { kind: "submarine", size: 3, label: "Submarine" },
  { kind: "destroyer", size: 2, label: "Destroyer" },
] as const;

export type Coord = readonly [row: number, col: number];

export interface PlacedShip {
  id: string;
  kind: ShipKind;
  size: number;
  cells: Coord[];
  hits: boolean[];
}

export type CellState =
  | { kind: "empty" }
  | { kind: "ship"; shipId: string; /** whether this cell is revealed (own board) */ revealed: boolean }
  | { kind: "miss" }
  | { kind: "hit"; shipId: string }
  | { kind: "sunk"; shipId: string };

export interface Board {
  ships: PlacedShip[];
  cells: CellState[][]; // [row][col]
}

export type Difficulty = 0 | 1 | 2; // Easy, Normal, Hard

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  0: "Easy",
  1: "Normal",
  2: "Hard",
};

// Dust-level entry fees: the user essentially only pays gas. Easy is free,
// Normal/Hard ask for a tiny stake to anti-farm without costing anything real.
export const DIFFICULTY_ENTRY_FEE_ETH: Record<Difficulty, string> = {
  0: "0",
  1: "0.00001",
  2: "0.00005",
};

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  0: 50,
  1: 75,
  2: 100,
};
