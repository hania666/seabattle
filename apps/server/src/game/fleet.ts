/**
 * Server-side ship-placement helpers used by the PvE anti-cheat layer.
 *
 * - `seededRandom(hex)` produces a deterministic `() => number` from a 32-byte
 *   seed. The same seed always yields the same sequence, on any machine.
 * - `randomFleet(random)` mirrors the web client's `randomFleet`: 5 ships
 *   (sizes 5/4/3/3/2), 10×10 board, no diagonal/orthogonal touching. Because
 *   it accepts an injected RNG it can be made reproducible from the seed.
 * - `validateUserFleet(ships)` checks a user-submitted placement: correct
 *   ship sizes, in-bounds, no overlap, no touching neighbours.
 *
 * The format we accept on the wire is `{ size: number; cells: [r, c][] }[]`,
 * matching what the web client serialises out of `Board.ships`.
 */
import { BOARD_SIZE } from "./types";

export type Coord = readonly [row: number, col: number];

export interface PlacedShip {
  size: number;
  cells: Coord[];
}

/** Required fleet sizes (sorted descending). */
export const FLEET_SIZES: readonly number[] = [5, 4, 3, 3, 2];
export const FLEET_TOTAL_CELLS = FLEET_SIZES.reduce((a, b) => a + b, 0); // 17

/**
 * Deterministic 32-bit PRNG seeded from a hex string. The output is a
 * function compatible with `Math.random` (returns floats in [0, 1)). We
 * use the splitmix32 mixer — fast, no dependencies, good enough for
 * gameplay determinism (NOT cryptographic).
 */
export function seededRandom(seedHex: string): () => number {
  const cleaned = seedHex.startsWith("0x") ? seedHex.slice(2) : seedHex;
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length === 0) {
    throw new Error("invalid seed hex");
  }
  // Fold the hex into a 32-bit state (xor every 8-hex chunk).
  let state = 0;
  for (let i = 0; i < cleaned.length; i += 8) {
    const chunk = cleaned.slice(i, i + 8).padEnd(8, "0");
    state = (state ^ parseInt(chunk, 16)) >>> 0;
  }
  if (state === 0) state = 1;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 0x100000000;
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function buildOccupancy(ships: PlacedShip[]): Set<string> {
  const occ = new Set<string>();
  for (const s of ships) {
    for (const [r, c] of s.cells) occ.add(`${r},${c}`);
  }
  return occ;
}

function canPlace(occ: Set<string>, cells: Coord[]): boolean {
  for (const [r, c] of cells) {
    if (!inBounds(r, c)) return false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (occ.has(`${nr},${nc}`)) return false;
      }
    }
  }
  return true;
}

function shipCells(r: number, c: number, size: number, horizontal: boolean): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < size; i++) {
    out.push(horizontal ? [r, c + i] : [r + i, c]);
  }
  return out;
}

/**
 * Generate a deterministic fleet from `random`. Mirrors the web client's
 * `randomFleet`: same fleet sizes, same touching rules. We don't claim
 * byte-identical placements vs the client today (that requires a shared
 * package); we only require that the *server's* replays are consistent
 * across runs.
 */
export function randomFleet(random: () => number): PlacedShip[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const ships: PlacedShip[] = [];
    let occ = new Set<string>();
    let success = true;
    for (const size of FLEET_SIZES) {
      const placed = tryPlaceRandom(occ, size, random);
      if (!placed) {
        success = false;
        break;
      }
      ships.push(placed);
      occ = buildOccupancy(ships);
    }
    if (success) return ships;
  }
  throw new Error("unable to place fleet");
}

function tryPlaceRandom(
  occ: Set<string>,
  size: number,
  random: () => number,
): PlacedShip | null {
  const attempts: [number, number, boolean][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      attempts.push([r, c, true], [r, c, false]);
    }
  }
  // Fisher–Yates with the injected RNG.
  for (let i = attempts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
  }
  for (const [r, c, horizontal] of attempts) {
    const cells = shipCells(r, c, size, horizontal);
    if (canPlace(occ, cells)) return { size, cells };
  }
  return null;
}

export class FleetValidationError extends Error {
  constructor(public readonly reason: string) {
    super(`invalid fleet: ${reason}`);
    this.name = "FleetValidationError";
  }
}

/**
 * Structural validation of a client-submitted fleet. Throws
 * `FleetValidationError` with a `reason` code when the layout is illegal.
 * Reason codes are stable so the API can return them and clients can react.
 */
export function validateUserFleet(input: unknown): PlacedShip[] {
  if (!Array.isArray(input)) {
    throw new FleetValidationError("not_array");
  }
  if (input.length !== FLEET_SIZES.length) {
    throw new FleetValidationError("wrong_ship_count");
  }
  const ships: PlacedShip[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      throw new FleetValidationError("ship_not_object");
    }
    const ship = raw as { size?: unknown; cells?: unknown };
    if (typeof ship.size !== "number" || !Number.isInteger(ship.size)) {
      throw new FleetValidationError("bad_size_type");
    }
    if (!Array.isArray(ship.cells) || ship.cells.length !== ship.size) {
      throw new FleetValidationError("size_cells_mismatch");
    }
    const cells: Coord[] = [];
    for (const cell of ship.cells) {
      if (
        !Array.isArray(cell) ||
        cell.length !== 2 ||
        typeof cell[0] !== "number" ||
        typeof cell[1] !== "number" ||
        !Number.isInteger(cell[0]) ||
        !Number.isInteger(cell[1])
      ) {
        throw new FleetValidationError("bad_cell_type");
      }
      if (!inBounds(cell[0], cell[1])) {
        throw new FleetValidationError("cell_out_of_bounds");
      }
      cells.push([cell[0], cell[1]] as Coord);
    }
    ships.push({ size: ship.size, cells });
  }

  const seenSizes = ships.map((s) => s.size).sort((a, b) => b - a);
  const wantSizes = [...FLEET_SIZES].sort((a, b) => b - a);
  if (seenSizes.join(",") !== wantSizes.join(",")) {
    throw new FleetValidationError("wrong_ship_sizes");
  }

  // Each ship's cells must be contiguous along one axis.
  for (const ship of ships) {
    if (!areCellsLinear(ship.cells)) {
      throw new FleetValidationError("ship_not_linear");
    }
  }

  // No overlap and no touching (8-neighbour rule).
  const occ = new Set<string>();
  for (const ship of ships) {
    if (!canPlace(occ, ship.cells)) {
      throw new FleetValidationError("ship_overlap_or_touching");
    }
    for (const [r, c] of ship.cells) occ.add(`${r},${c}`);
  }

  return ships;
}

function areCellsLinear(cells: Coord[]): boolean {
  if (cells.length < 1) return false;
  if (cells.length === 1) return true;
  const rows = new Set(cells.map((c) => c[0]));
  const cols = new Set(cells.map((c) => c[1]));
  if (rows.size === 1) {
    const sorted = cells.map((c) => c[1]).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  }
  if (cols.size === 1) {
    const sorted = cells.map((c) => c[0]).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  }
  return false;
}
