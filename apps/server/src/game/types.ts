export const BOARD_SIZE = 10;

export type Orientation = "horizontal" | "vertical";

export type ShipKind = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export interface ShipSpec {
  kind: ShipKind;
  size: number;
}

export const FLEET: readonly ShipSpec[] = [
  { kind: "carrier", size: 5 },
  { kind: "battleship", size: 4 },
  { kind: "cruiser", size: 3 },
  { kind: "submarine", size: 3 },
  { kind: "destroyer", size: 2 },
] as const;

export type Coord = readonly [row: number, col: number];

export interface Ship {
  kind: ShipKind;
  cells: Coord[];
  hits: boolean[];
}

export type Shot = "miss" | "hit" | "sunk";

export interface ShotOutcome {
  outcome: Shot;
  sunkShipCells?: Coord[];
  allSunk: boolean;
}
