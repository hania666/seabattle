import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeShip, shipCells } from "../board";
import { createBotMemory, pickBotShot, rememberShot } from "../bot";
import { fireShot } from "../shots";
import type { Coord } from "../types";

const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

describe("bot", () => {
  it("never fires on the same cell twice", () => {
    let board = placeShip(createEmptyBoard(), "carrier", shipCells(0, 0, 5, "horizontal"));
    let memory = createBotMemory();
    const rng = seeded(42);
    const fired = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const shot = pickBotShot(board, memory, 0, rng);
      const k = `${shot[0]},${shot[1]}`;
      expect(fired.has(k)).toBe(false);
      fired.add(k);
      const res = fireShot(board, shot[0], shot[1]);
      board = res.board;
      memory = rememberShot(memory, shot, res.outcome as "miss" | "hit" | "sunk", board);
    }
  });

  it("after a hit, chases orthogonal neighbors", () => {
    let board = placeShip(createEmptyBoard(), "cruiser", shipCells(4, 4, 3, "horizontal"));
    let memory = createBotMemory();
    // Simulate a hit at (4, 4).
    const hit: Coord = [4, 4];
    const res = fireShot(board, hit[0], hit[1]);
    board = res.board;
    memory = rememberShot(memory, hit, "hit", board);
    // Next shot should be an orthogonal neighbor of (4, 4).
    const next = pickBotShot(board, memory, 0, seeded(1));
    const neighbors: Coord[] = [
      [3, 4],
      [5, 4],
      [4, 3],
      [4, 5],
    ];
    expect(neighbors.some((n) => n[0] === next[0] && n[1] === next[1])).toBe(true);
  });

  it("normal difficulty targets checkerboard parity when random", () => {
    let board = createEmptyBoard();
    let memory = createBotMemory();
    const rng = seeded(7);
    for (let i = 0; i < 10; i++) {
      const shot = pickBotShot(board, memory, 1, rng);
      expect((shot[0] + shot[1]) % 2).toBe(0);
      memory = rememberShot(memory, shot, "miss", board);
      board = fireShot(board, shot[0], shot[1]).board;
    }
  });
});
