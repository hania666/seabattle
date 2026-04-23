import { describe, expect, it } from "vitest";
import {
  applyOpponentShots,
  buildEnemyBoard,
  countDistinctSunk,
  countOwnShipsSunk,
} from "../boardBuilders";
import { createEmptyBoard, placeShip } from "../../../lib/game/board";
import type { ShotRecord } from "../../../lib/pvp/state";

describe("PvpGameBoard helpers", () => {
  it("buildEnemyBoard renders miss/hit/sunk cells", () => {
    const shots: ShotRecord[] = [
      { coord: [0, 0], outcome: "miss" },
      { coord: [1, 1], outcome: "hit" },
      {
        coord: [2, 2],
        outcome: "sunk",
        sunkShipCells: [
          [2, 2],
          [2, 3],
        ],
      },
    ];
    const board = buildEnemyBoard(shots);
    expect(board.cells[0][0].kind).toBe("miss");
    expect(board.cells[1][1].kind).toBe("hit");
    expect(board.cells[2][2].kind).toBe("sunk");
    expect(board.cells[2][3].kind).toBe("sunk");
  });

  it("buildEnemyBoard falls back to hit when sunkShipCells is missing", () => {
    const shots: ShotRecord[] = [{ coord: [4, 4], outcome: "sunk" }];
    const board = buildEnemyBoard(shots);
    expect(board.cells[4][4].kind).toBe("hit");
  });

  it("applyOpponentShots overlays hits and preserves ship metadata", () => {
    let board = createEmptyBoard();
    board = placeShip(board, "destroyer", [
      [0, 0],
      [0, 1],
    ]);
    const shots: ShotRecord[] = [
      { coord: [0, 0], outcome: "hit" },
      { coord: [5, 5], outcome: "miss" },
    ];
    const out = applyOpponentShots(board, shots);
    expect(out.cells[0][0].kind).toBe("hit");
    expect(out.cells[5][5].kind).toBe("miss");
    // Untouched ship cell stays as ship.
    expect(out.cells[0][1].kind).toBe("ship");
  });

  it("countDistinctSunk counts sunk outcomes in our fire log", () => {
    expect(
      countDistinctSunk([
        { coord: [0, 0], outcome: "hit" },
        { coord: [0, 1], outcome: "sunk" },
        { coord: [4, 4], outcome: "sunk" },
      ]),
    ).toBe(2);
  });

  it("countOwnShipsSunk counts distinct sunk shipIds on own board", () => {
    let board = createEmptyBoard();
    board = placeShip(board, "destroyer", [
      [0, 0],
      [0, 1],
    ]);
    board = placeShip(board, "cruiser", [
      [3, 0],
      [3, 1],
      [3, 2],
    ]);
    const sunkBoard = applyOpponentShots(board, [
      {
        coord: [0, 0],
        outcome: "sunk",
        sunkShipCells: [
          [0, 0],
          [0, 1],
        ],
      },
    ]);
    expect(countOwnShipsSunk(sunkBoard)).toBe(1);
  });
});
