import { describe, expect, it } from "vitest";
import {
  MoveLogValidationError,
  parseChainMatchId,
  parseDifficulty,
  parseMoveLog,
  PveError,
  replayMatch,
  type MoveLogEntry,
} from "../pve";
import type { PlacedShip } from "../game/fleet";

describe("parseChainMatchId", () => {
  it("accepts a well-formed bytes32 hex", () => {
    const id = `0x${"a".repeat(64)}`;
    expect(parseChainMatchId(id)).toBe(id);
  });

  it("lower-cases mixed-case hex", () => {
    const id = `0x${"ABcdef".repeat(10)}abcd`;
    expect(parseChainMatchId(id)).toBe(id.toLowerCase());
  });

  it.each([
    null,
    undefined,
    "",
    "0x",
    "0x123",
    `0x${"g".repeat(64)}`,
    `0x${"a".repeat(63)}`,
    `0x${"a".repeat(65)}`,
    `${"a".repeat(64)}`,
    1,
    {},
  ])("rejects %p", (v) => {
    expect(() => parseChainMatchId(v)).toThrow(PveError);
  });
});

describe("parseDifficulty", () => {
  it("accepts the three legal values", () => {
    expect(parseDifficulty("easy")).toBe("easy");
    expect(parseDifficulty("normal")).toBe("normal");
    expect(parseDifficulty("hard")).toBe("hard");
  });
  it.each([null, undefined, 0, "EASY", "extreme", {}])("rejects %p", (v) => {
    expect(() => parseDifficulty(v)).toThrow(PveError);
  });
});

describe("parseMoveLog", () => {
  it("accepts a small well-formed log", () => {
    const log = parseMoveLog([
      { by: "user", coord: [0, 0], hit: true },
      { by: "bot", coord: [9, 9], hit: false },
    ]);
    expect(log).toHaveLength(2);
    expect(log[0]).toEqual({ by: "user", coord: [0, 0], hit: true });
  });

  it("rejects non-array", () => {
    expect(() => parseMoveLog({})).toThrow(MoveLogValidationError);
    expect(() => parseMoveLog(null)).toThrow(MoveLogValidationError);
  });

  it("rejects entries with bad shape", () => {
    expect(() => parseMoveLog([{ by: "user", coord: [0, 0] }])).toThrow(
      MoveLogValidationError,
    );
    expect(() =>
      parseMoveLog([{ by: "alien", coord: [0, 0], hit: true }]),
    ).toThrow(MoveLogValidationError);
  });

  it("rejects coords out of the 10×10 board", () => {
    expect(() =>
      parseMoveLog([{ by: "user", coord: [10, 0], hit: false }]),
    ).toThrow(MoveLogValidationError);
    expect(() =>
      parseMoveLog([{ by: "user", coord: [-1, 0], hit: false }]),
    ).toThrow(MoveLogValidationError);
    expect(() =>
      parseMoveLog([{ by: "user", coord: [0, 1.5], hit: false }]),
    ).toThrow(MoveLogValidationError);
  });

  it("rejects duplicate shots from the same side", () => {
    expect(() =>
      parseMoveLog([
        { by: "user", coord: [0, 0], hit: true },
        { by: "user", coord: [0, 0], hit: true },
      ]),
    ).toThrow(MoveLogValidationError);
  });

  it("allows the same coord from each side once", () => {
    const log = parseMoveLog([
      { by: "user", coord: [0, 0], hit: true },
      { by: "bot", coord: [0, 0], hit: false },
    ]);
    expect(log).toHaveLength(2);
  });

  it("rejects oversized logs", () => {
    const huge = Array.from({ length: 201 }, (_, i) => ({
      by: i % 2 === 0 ? "user" : "bot",
      coord: [Math.floor(i / 20), i % 10],
      hit: false,
    }));
    expect(() => parseMoveLog(huge)).toThrow(MoveLogValidationError);
  });
});

describe("replayMatch", () => {
  // Disjoint placements so user/bot fleets don't collide. Bot occupies the
  // top half (rows 0-2), user occupies the bottom half (rows 7-9). 17 cells
  // each, the standard fleet shape (5+4+3+3+2 = 17).
  const botShips: PlacedShip[] = [
    { size: 5, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { size: 4, cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },
    { size: 3, cells: [[2, 0], [2, 1], [2, 2]] },
    { size: 3, cells: [[2, 5], [2, 6], [2, 7]] },
    { size: 2, cells: [[2, 9], [1, 9]] },
  ];
  const userShips: PlacedShip[] = [
    { size: 5, cells: [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4]] },
    { size: 4, cells: [[8, 0], [8, 1], [8, 2], [8, 3]] },
    { size: 3, cells: [[7, 0], [7, 1], [7, 2]] },
    { size: 3, cells: [[7, 5], [7, 6], [7, 7]] },
    { size: 2, cells: [[7, 9], [8, 9]] },
  ];

  function userHitAll(): MoveLogEntry[] {
    return botShips.flatMap((s) =>
      s.cells.map((c) => ({ by: "user" as const, coord: [c[0], c[1]] as [number, number], hit: true })),
    );
  }
  function botHitAll(): MoveLogEntry[] {
    return userShips.flatMap((s) =>
      s.cells.map((c) => ({ by: "bot" as const, coord: [c[0], c[1]] as [number, number], hit: true })),
    );
  }

  it("accepts a clean win (all 17 user hits, no extras)", () => {
    expect(() => replayMatch(userHitAll(), botShips, userShips, true)).not.toThrow();
  });

  it("accepts a clean loss (bot sinks user fleet first)", () => {
    expect(() => replayMatch(botHitAll(), botShips, userShips, false)).not.toThrow();
  });

  it("accepts a giveup loss (no fleet fully sunk, claimedWon=false)", () => {
    const log: MoveLogEntry[] = [
      { by: "user", coord: [5, 5], hit: false },
      { by: "bot", coord: [5, 5], hit: false },
    ];
    expect(() => replayMatch(log, botShips, userShips, false)).not.toThrow();
  });

  it("rejects a phantom user hit on an empty cell", () => {
    const log: MoveLogEntry[] = [{ by: "user", coord: [5, 5], hit: true }];
    expect(() => replayMatch(log, botShips, userShips, false)).toThrow(
      expect.objectContaining({ code: "phantom_hit" }),
    );
  });

  it("rejects a user miss on a real bot ship cell", () => {
    const log: MoveLogEntry[] = [{ by: "user", coord: [0, 0], hit: false }];
    expect(() => replayMatch(log, botShips, userShips, false)).toThrow(
      expect.objectContaining({ code: "missed_actual_ship" }),
    );
  });

  it("rejects a phantom bot hit on an empty cell (NEW in 8.8)", () => {
    const log: MoveLogEntry[] = [{ by: "bot", coord: [5, 5], hit: true }];
    expect(() => replayMatch(log, botShips, userShips, false)).toThrow(
      expect.objectContaining({ code: "bot_phantom_hit" }),
    );
  });

  it("rejects a bot miss that should have hit a user ship (NEW in 8.8)", () => {
    const log: MoveLogEntry[] = [{ by: "bot", coord: [9, 0], hit: false }];
    expect(() => replayMatch(log, botShips, userShips, false)).toThrow(
      expect.objectContaining({ code: "bot_missed_actual_ship" }),
    );
  });

  it("rejects extra moves recorded after the user has already won", () => {
    const log = [
      ...userHitAll(),
      { by: "bot" as const, coord: [9, 0] as [number, number], hit: true },
    ];
    expect(() => replayMatch(log, botShips, userShips, true)).toThrow(
      expect.objectContaining({ code: "move_after_finish" }),
    );
  });

  it("rejects a claimed win when bot actually won first", () => {
    const log = [
      ...botHitAll(),
      // (No further user moves — fleet's already sunk. The user is lying about won=true.)
    ];
    expect(() => replayMatch(log, botShips, userShips, true)).toThrow(
      expect.objectContaining({ code: "win_unverified" }),
    );
  });

  it("rejects a claimed loss when user actually won (loss_unverified)", () => {
    expect(() => replayMatch(userHitAll(), botShips, userShips, false)).toThrow(
      expect.objectContaining({ code: "loss_unverified" }),
    );
  });

  it("rejects a claimed win with no full fleet sunk (win_unverified)", () => {
    const log: MoveLogEntry[] = [{ by: "user", coord: [0, 0], hit: true }];
    expect(() => replayMatch(log, botShips, userShips, true)).toThrow(
      expect.objectContaining({ code: "win_unverified" }),
    );
  });

  it("interleaves moves and decides the match on whichever side completes first", () => {
    // Bot lands all 17 hits before user's last hit — bot wins, user can't claim.
    const interleaved: MoveLogEntry[] = [];
    const userMoves = userHitAll();
    const botMoves = botHitAll();
    for (let i = 0; i < 16; i++) {
      interleaved.push(userMoves[i]);
      interleaved.push(botMoves[i]);
    }
    interleaved.push(botMoves[16]); // bot wins on its 17th hit
    expect(() => replayMatch(interleaved, botShips, userShips, false)).not.toThrow();
    expect(() => replayMatch(interleaved, botShips, userShips, true)).toThrow(
      expect.objectContaining({ code: "win_unverified" }),
    );
  });
});
