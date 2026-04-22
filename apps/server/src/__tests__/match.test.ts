import { describe, expect, it } from "vitest";
import { Match } from "../game/match";
import type { FleetInput } from "../game/board";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const MATCH_ID = `0x${"11".repeat(32)}` as const;

function validFleet(offset = 0): FleetInput[] {
  // Five ships of sizes 5, 4, 3, 3, 2, each on its own row (even rows so they
  // don't touch diagonally).
  return [
    { kind: "carrier", cells: [[0, 0 + offset], [0, 1 + offset], [0, 2 + offset], [0, 3 + offset], [0, 4 + offset]] },
    { kind: "battleship", cells: [[2, 0], [2, 1], [2, 2], [2, 3]] },
    { kind: "cruiser", cells: [[4, 0], [4, 1], [4, 2]] },
    { kind: "submarine", cells: [[6, 0], [6, 1], [6, 2]] },
    { kind: "destroyer", cells: [[8, 0], [8, 1]] },
  ];
}

describe("Match", () => {
  it("requires both sides to place fleets before firing", () => {
    const m = new Match({ matchId: MATCH_ID, stake: 100n, playerA: A, playerB: B });
    const res = m.placeFleet("A", validFleet());
    expect(res).toEqual({ ok: true, bothPlaced: false });
    expect(m.getTurn()).toBeNull();
    m.placeFleet("B", validFleet());
    expect(m.getTurn()).not.toBeNull();
  });

  it("rejects invalid fleets", () => {
    const m = new Match({ matchId: MATCH_ID, stake: 100n, playerA: A, playerB: B });
    const bad: FleetInput[] = [
      // Touches battleship diagonally (9,0 is adjacent to (8,0) destroyer in valid fleet — but this is the WHOLE fleet, so different).
      { kind: "carrier", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] }, // wrong size
      ...validFleet().slice(1),
    ];
    const res = m.placeFleet("A", bad);
    expect(res.ok).toBe(false);
  });

  it("full match flow: misses swap the turn, hits keep it", () => {
    const m = new Match({ matchId: MATCH_ID, stake: 100n, playerA: A, playerB: B });
    m.placeFleet("A", validFleet());
    m.placeFleet("B", validFleet());
    m.setTurnForTest("A");

    // A fires at (5, 5) — that's an empty cell on B's fleet — miss.
    const miss = m.fire("A", 5, 5);
    expect(miss.ok && miss.outcome.outcome).toBe("miss");
    expect(m.getTurn()).toBe("B");

    // B's turn: firing out of turn should fail for A.
    const denied = m.fire("A", 0, 0);
    expect(denied.ok).toBe(false);

    // B fires at A's battleship at (2, 0) — hit, keeps turn.
    const hit = m.fire("B", 2, 0);
    expect(hit.ok && hit.outcome.outcome).toBe("hit");
    expect(m.getTurn()).toBe("B");
  });

  it("sinks all ships and declares winner", () => {
    const m = new Match({ matchId: MATCH_ID, stake: 100n, playerA: A, playerB: B });
    m.placeFleet("A", validFleet());
    m.placeFleet("B", validFleet());
    m.setTurnForTest("A");

    // A fires at every cell of B's fleet.
    const targets: [number, number][] = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], // carrier
      [2, 0], [2, 1], [2, 2], [2, 3],
      [4, 0], [4, 1], [4, 2],
      [6, 0], [6, 1], [6, 2],
      [8, 0], [8, 1],
    ];
    for (const [r, c] of targets) {
      const res = m.fire("A", r, c);
      expect(res.ok).toBe(true);
    }
    expect(m.isFinished()).toBe(true);
    expect(m.getResult()).toEqual({ winner: A, loser: B });
  });

  it("rejects duplicate shots at the same cell", () => {
    const m = new Match({ matchId: MATCH_ID, stake: 100n, playerA: A, playerB: B });
    m.placeFleet("A", validFleet());
    m.placeFleet("B", validFleet());
    m.setTurnForTest("A");
    m.fire("A", 5, 5);
    m.fire("B", 9, 9); // B's turn because miss, then B's miss -> A's turn
    const dup = m.fire("A", 5, 5);
    expect(dup.ok).toBe(false);
  });
});
