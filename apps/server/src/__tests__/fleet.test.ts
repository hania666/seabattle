import { describe, expect, it } from "vitest";
import {
  FleetValidationError,
  FLEET_SIZES,
  FLEET_TOTAL_CELLS,
  randomFleet,
  seededRandom,
  validateUserFleet,
} from "../game/fleet";

describe("seededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = seededRandom("0xdeadbeef");
    const b = seededRandom("0xdeadbeef");
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it("differs across seeds", () => {
    const a = seededRandom("0x01");
    const b = seededRandom("0x02");
    const seqA = Array.from({ length: 20 }, a);
    const seqB = Array.from({ length: 20 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it("rejects non-hex input", () => {
    expect(() => seededRandom("nothex")).toThrow(/invalid seed/);
    expect(() => seededRandom("")).toThrow(/invalid seed/);
  });
});

describe("randomFleet", () => {
  it("places every ship size from a deterministic seed", () => {
    const fleet = randomFleet(seededRandom("0xa1b2c3d4e5"));
    const sizes = fleet.map((s) => s.size).sort((a, b) => b - a);
    expect(sizes).toEqual([...FLEET_SIZES].sort((a, b) => b - a));
    const total = fleet.reduce((acc, s) => acc + s.cells.length, 0);
    expect(total).toBe(FLEET_TOTAL_CELLS);
  });

  it("yields the same placement on identical seeds", () => {
    const a = randomFleet(seededRandom("0x1234"));
    const b = randomFleet(seededRandom("0x1234"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

function shipWithCells(size: number, row: number, col: number): {
  size: number;
  cells: [number, number][];
} {
  return {
    size,
    cells: Array.from({ length: size }, (_, i) => [row, col + i]) as [number, number][],
  };
}

describe("validateUserFleet", () => {
  const legalFleet = [
    shipWithCells(5, 0, 0),
    shipWithCells(4, 2, 0),
    shipWithCells(3, 4, 0),
    shipWithCells(3, 6, 0),
    shipWithCells(2, 8, 0),
  ];

  it("accepts a legal placement", () => {
    expect(() => validateUserFleet(legalFleet)).not.toThrow();
  });

  it("rejects wrong ship count", () => {
    expect(() => validateUserFleet(legalFleet.slice(0, 4))).toThrow(FleetValidationError);
  });

  it("rejects bad cell types", () => {
    expect(() =>
      validateUserFleet([
        { size: 2, cells: [["a", 0], [0, 1]] },
        ...legalFleet.slice(1),
      ]),
    ).toThrow(FleetValidationError);
  });

  it("rejects out-of-bounds cells", () => {
    expect(() =>
      validateUserFleet([
        { size: 2, cells: [[10, 0], [10, 1]] },
        ...legalFleet.slice(1),
      ]),
    ).toThrow(FleetValidationError);
  });

  it("rejects wrong ship sizes (e.g. five 5s)", () => {
    const wrong = Array.from({ length: 5 }, (_, i) => shipWithCells(5, i * 2, 0));
    expect(() => validateUserFleet(wrong)).toThrow(FleetValidationError);
  });

  it("rejects overlapping ships", () => {
    expect(() =>
      validateUserFleet([
        shipWithCells(5, 0, 0),
        shipWithCells(4, 0, 0), // same start as first
        shipWithCells(3, 4, 0),
        shipWithCells(3, 6, 0),
        shipWithCells(2, 8, 0),
      ]),
    ).toThrow(FleetValidationError);
  });

  it("rejects diagonally-touching ships", () => {
    expect(() =>
      validateUserFleet([
        shipWithCells(5, 0, 0),
        shipWithCells(4, 1, 5), // diagonally touches the 5-ship
        shipWithCells(3, 4, 0),
        shipWithCells(3, 6, 0),
        shipWithCells(2, 8, 0),
      ]),
    ).toThrow(FleetValidationError);
  });

  it("rejects non-linear ship cells", () => {
    expect(() =>
      validateUserFleet([
        { size: 5, cells: [[0, 0], [0, 1], [1, 0], [0, 3], [0, 4]] },
        ...legalFleet.slice(1),
      ]),
    ).toThrow(FleetValidationError);
  });

  it("rejects mismatched size/cells.length", () => {
    expect(() =>
      validateUserFleet([
        { size: 5, cells: [[0, 0], [0, 1]] },
        ...legalFleet.slice(1),
      ]),
    ).toThrow(FleetValidationError);
  });
});
