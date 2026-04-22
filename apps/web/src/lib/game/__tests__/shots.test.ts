import { describe, expect, it } from "vitest";
import { placeShip, createEmptyBoard, shipCells } from "../board";
import { allShipsSunk, fireShot } from "../shots";

describe("shots", () => {
  it("miss marks cell as miss and does not affect ships", () => {
    const board = placeShip(createEmptyBoard(), "destroyer", shipCells(0, 0, 2, "horizontal"));
    const r = fireShot(board, 5, 5);
    expect(r.outcome).toBe("miss");
    expect(r.board.cells[5][5].kind).toBe("miss");
    expect(r.allSunk).toBe(false);
  });

  it("hit then sink sets all cells to sunk", () => {
    let board = placeShip(createEmptyBoard(), "destroyer", shipCells(3, 3, 2, "horizontal"));
    let r = fireShot(board, 3, 3);
    expect(r.outcome).toBe("hit");
    board = r.board;
    r = fireShot(board, 3, 4);
    expect(r.outcome).toBe("sunk");
    expect(r.sunkShipCells).toEqual([
      [3, 3],
      [3, 4],
    ]);
    expect(r.board.cells[3][3].kind).toBe("sunk");
    expect(r.board.cells[3][4].kind).toBe("sunk");
    expect(r.allSunk).toBe(true);
  });

  it("already-fired cell returns 'already'", () => {
    let board = placeShip(createEmptyBoard(), "destroyer", shipCells(0, 0, 2, "horizontal"));
    board = fireShot(board, 5, 5).board;
    const r = fireShot(board, 5, 5);
    expect(r.outcome).toBe("already");
  });

  it("allShipsSunk false until every ship is sunk", () => {
    let board = placeShip(createEmptyBoard(), "destroyer", shipCells(0, 0, 2, "horizontal"));
    board = placeShip(board, "submarine", shipCells(5, 0, 3, "horizontal"));
    for (const [r, c] of [
      [0, 0],
      [0, 1],
    ] as const) {
      board = fireShot(board, r, c).board;
    }
    expect(allShipsSunk(board)).toBe(false);
    for (const [r, c] of [
      [5, 0],
      [5, 1],
      [5, 2],
    ] as const) {
      board = fireShot(board, r, c).board;
    }
    expect(allShipsSunk(board)).toBe(true);
  });
});
