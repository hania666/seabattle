import { BOARD_SIZE, FLEET, type Coord, type Ship, type ShipKind } from "./types";

export interface FleetInput {
  kind: ShipKind;
  cells: Coord[];
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/**
 * Validate that the submitted fleet matches the fleet spec exactly (one of each
 * ship kind, each the correct size, placed in-bounds, straight, non-overlapping
 * and non-adjacent).
 */
export function validateFleet(input: FleetInput[]): { ok: true; ships: Ship[] } | { ok: false; error: string } {
  if (input.length !== FLEET.length) {
    return { ok: false, error: `expected ${FLEET.length} ships, got ${input.length}` };
  }
  const kindCount = new Map<ShipKind, number>();
  for (const spec of FLEET) kindCount.set(spec.kind, 0);

  const occupied = new Map<string, string>(); // "r,c" -> shipKind

  const ships: Ship[] = [];
  for (const { kind, cells } of input) {
    const spec = FLEET.find((s) => s.kind === kind);
    if (!spec) return { ok: false, error: `unknown ship kind: ${kind}` };
    if (cells.length !== spec.size) {
      return { ok: false, error: `${kind} must have ${spec.size} cells, got ${cells.length}` };
    }
    if (!isStraight(cells)) return { ok: false, error: `${kind} is not a straight line` };
    for (const [r, c] of cells) {
      if (!inBounds(r, c)) return { ok: false, error: `${kind} has out-of-bounds cell ${r},${c}` };
      // Adjacency check: 8-neighborhood of each cell must not touch other ships.
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const key = `${r + dr},${c + dc}`;
          const owner = occupied.get(key);
          if (owner && owner !== kind) {
            return { ok: false, error: `${kind} touches ${owner}` };
          }
        }
      }
    }
    for (const [r, c] of cells) occupied.set(`${r},${c}`, kind);
    kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);
    ships.push({ kind, cells: cells.map(([r, c]) => [r, c] as Coord), hits: Array(cells.length).fill(false) });
  }

  for (const spec of FLEET) {
    if ((kindCount.get(spec.kind) ?? 0) !== 1) {
      return { ok: false, error: `fleet must contain exactly one ${spec.kind}` };
    }
  }
  return { ok: true, ships };
}

function isStraight(cells: Coord[]): boolean {
  if (cells.length < 2) return true;
  const sorted = [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const rowsSame = sorted.every(([r]) => r === sorted[0][0]);
  const colsSame = sorted.every(([, c]) => c === sorted[0][1]);
  if (rowsSame) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][1] !== sorted[i - 1][1] + 1) return false;
    }
    return true;
  }
  if (colsSame) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][0] !== sorted[i - 1][0] + 1) return false;
    }
    return true;
  }
  return false;
}
