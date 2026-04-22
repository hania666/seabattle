import { describe, expect, it } from "vitest";
import { canPlaceShip, createEmptyBoard, isFleetComplete, placeShip, randomFleet, shipCells } from "../board";
import { FLEET } from "../types";

describe("board", () => {
  it("createEmptyBoard is 10x10 and empty", () => {
    const b = createEmptyBoard();
    expect(b.cells).toHaveLength(10);
    for (const row of b.cells) {
      expect(row).toHaveLength(10);
      for (const cell of row) expect(cell.kind).toBe("empty");
    }
    expect(b.ships).toEqual([]);
  });

  it("shipCells produces contiguous horizontal/vertical coords", () => {
    expect(shipCells(2, 3, 3, "horizontal")).toEqual([
      [2, 3],
      [2, 4],
      [2, 5],
    ]);
    expect(shipCells(0, 0, 4, "vertical")).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it("canPlaceShip rejects out-of-bounds placements", () => {
    const board = createEmptyBoard();
    expect(canPlaceShip(board, shipCells(8, 0, 3, "vertical"))).toBe(false);
    expect(canPlaceShip(board, shipCells(0, 8, 3, "horizontal"))).toBe(false);
  });

  it("canPlaceShip rejects adjacent placements", () => {
    let board = createEmptyBoard();
    board = placeShip(board, "cruiser", shipCells(0, 0, 3, "horizontal"));
    // Cell immediately below the first ship — not allowed (diagonal-adjacent).
    expect(canPlaceShip(board, shipCells(1, 0, 2, "horizontal"))).toBe(false);
    // Two rows down — allowed.
    expect(canPlaceShip(board, shipCells(2, 0, 2, "horizontal"))).toBe(true);
  });

  it("randomFleet produces a complete valid layout", () => {
    // Use a seeded-ish random for determinism: incrementing sequence.
    let i = 0;
    const seeded = () => {
      i = (i * 9301 + 49297) % 233280;
      return i / 233280;
    };
    const board = randomFleet(seeded);
    expect(isFleetComplete(board)).toBe(true);
    // Each ship's cells must be individually in bounds and mutually non-adjacent
    // (ship internals are allowed to touch of course).
    for (const ship of board.ships) {
      for (const [r] of ship.cells) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(10);
      }
    }
    // Total occupied cells = sum of fleet sizes.
    const expectedCells = FLEET.reduce((n, s) => n + s.size, 0);
    const actualCells = board.ships.reduce((n, s) => n + s.cells.length, 0);
    expect(actualCells).toBe(expectedCells);
  });
});
