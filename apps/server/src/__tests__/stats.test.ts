import { describe, expect, it } from "vitest";
import { parseClientStats, StatsValidationError } from "../stats";

describe("parseClientStats", () => {
  it("accepts a fully-populated valid payload", () => {
    const out = parseClientStats({
      xp: 120,
      coins: 50,
      pveWins: 3,
      pveLosses: 1,
      pvpWins: 0,
      pvpLosses: 2,
      longestWinStreak: 4,
    });
    expect(out).toEqual({
      xp: 120,
      coins: 50,
      pveWins: 3,
      pveLosses: 1,
      pvpWins: 0,
      pvpLosses: 2,
      longestWinStreak: 4,
    });
  });

  it("ignores extra unknown fields", () => {
    const out = parseClientStats({
      xp: 1,
      coins: 1,
      pveWins: 1,
      pveLosses: 1,
      pvpWins: 1,
      pvpLosses: 1,
      longestWinStreak: 1,
      ghost: "boo",
      __proto__: { admin: true },
    });
    expect(out.xp).toBe(1);
    expect("ghost" in out).toBe(false);
  });

  it.each([
    ["xp", { xp: -1 }],
    ["xp", { xp: 1.5 }],
    ["xp", { xp: Number.POSITIVE_INFINITY }],
    ["xp", { xp: "100" }],
    ["xp", { xp: 1_000_001 }],
    ["pveWins", { xp: 1, coins: 1, pveWins: -3 }],
    ["coins", { xp: 1, coins: NaN }],
  ])("rejects bad %s", (field, partial) => {
    const base = {
      xp: 0,
      coins: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      longestWinStreak: 0,
    };
    expect(() => parseClientStats({ ...base, ...partial })).toThrow(
      StatsValidationError,
    );
    try {
      parseClientStats({ ...base, ...partial });
    } catch (e) {
      expect((e as StatsValidationError).field).toBe(field);
    }
  });

  it("rejects missing fields", () => {
    expect(() => parseClientStats({})).toThrow(StatsValidationError);
    expect(() => parseClientStats({ xp: 1 })).toThrow(StatsValidationError);
  });

  it("rejects non-object input", () => {
    expect(() => parseClientStats(null)).toThrow(StatsValidationError);
    expect(() => parseClientStats(undefined)).toThrow(StatsValidationError);
  });
});
