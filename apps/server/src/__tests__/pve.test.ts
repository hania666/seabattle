import { describe, expect, it } from "vitest";
import {
  MoveLogValidationError,
  parseChainMatchId,
  parseDifficulty,
  parseMoveLog,
  PveError,
} from "../pve";

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
