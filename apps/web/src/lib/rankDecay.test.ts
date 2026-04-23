import { describe, expect, it } from "vitest";
import type { MatchRecord, PlayerStats } from "./stats";

function m(
  partial: Partial<MatchRecord> & { playedAt: number; won: boolean },
): MatchRecord {
  return {
    id: String(partial.playedAt),
    mode: "pve",
    xpGained: 0,
    ...partial,
  };
}
import {
  DECAY_PER_WEEK,
  FLOOR_XP,
  INACTIVITY_GRACE_MS,
  STREAK_THRESHOLD,
  WEEK_MS,
  applyXpDelta,
  currentLossStreak,
  daysUntilDecay,
  lossStreakPenalty,
  pendingInactivityDecay,
} from "./rankDecay";

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    xp: 0,
    pveWins: 0,
    pveLosses: 0,
    pvpWins: 0,
    pvpLosses: 0,
    matches: [],
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe("pendingInactivityDecay", () => {
  it("charges nothing inside the grace window", () => {
    const stats = makeStats({
      xp: 500,
      matches: [m({ won: true, playedAt: Date.now() - 5 * DAY })],
    });
    expect(pendingInactivityDecay(stats).loss).toBe(0);
  });

  it("charges DECAY_PER_WEEK after the grace period elapses a week", () => {
    const playedAt = Date.now() - (INACTIVITY_GRACE_MS + WEEK_MS + 1000);
    const stats = makeStats({
      xp: 500,
      matches: [m({ won: true, playedAt })],
    });
    expect(pendingInactivityDecay(stats).loss).toBe(DECAY_PER_WEEK);
  });

  it("scales with elapsed weeks past grace", () => {
    const playedAt = Date.now() - (INACTIVITY_GRACE_MS + 4 * WEEK_MS);
    const stats = makeStats({
      xp: 500,
      matches: [m({ won: true, playedAt })],
    });
    expect(pendingInactivityDecay(stats).loss).toBe(4 * DECAY_PER_WEEK);
  });

  it("never drains below the floor", () => {
    const playedAt = Date.now() - (INACTIVITY_GRACE_MS + 100 * WEEK_MS);
    const stats = makeStats({
      xp: FLOOR_XP + 30,
      matches: [m({ won: true, playedAt })],
    });
    expect(pendingInactivityDecay(stats).loss).toBe(30);
  });

  it("no match history → no decay", () => {
    expect(pendingInactivityDecay(makeStats({ xp: 500 })).loss).toBe(0);
  });
});

describe("currentLossStreak", () => {
  it("returns zero when last match was a win or history empty", () => {
    expect(currentLossStreak(makeStats())).toBe(0);
    expect(
      currentLossStreak(
        makeStats({ matches: [m({ won: true, playedAt: 1 })] }),
      ),
    ).toBe(0);
  });

  it("counts consecutive recent losses", () => {
    const stats = makeStats({
      matches: [
        m({ won: false, playedAt: 3 }),
        m({ won: false, playedAt: 2 }),
        m({ mode: "pvp", won: false, playedAt: 1 }),
        m({ won: true, playedAt: 0 }),
      ],
    });
    expect(currentLossStreak(stats)).toBe(STREAK_THRESHOLD);
  });
});

describe("lossStreakPenalty", () => {
  it("scales with rank bracket", () => {
    expect(lossStreakPenalty(50)).toBe(10);
    expect(lossStreakPenalty(250)).toBe(25);
    expect(lossStreakPenalty(1000)).toBe(50);
    expect(lossStreakPenalty(2500)).toBe(100);
    expect(lossStreakPenalty(5000)).toBe(200);
    expect(lossStreakPenalty(8000)).toBe(300);
    expect(lossStreakPenalty(15000)).toBe(400);
    expect(lossStreakPenalty(50000)).toBe(500);
  });
});

describe("applyXpDelta", () => {
  it("clamps at the floor once cleared", () => {
    expect(applyXpDelta(120, -50)).toBe(100);
    expect(applyXpDelta(120, -1000)).toBe(100);
  });

  it("allows natural gains", () => {
    expect(applyXpDelta(200, 50)).toBe(250);
  });

  it("floors at zero pre-floor", () => {
    expect(applyXpDelta(40, -100)).toBe(0);
  });
});

describe("daysUntilDecay", () => {
  it("returns null with no history", () => {
    expect(daysUntilDecay(makeStats())).toBeNull();
  });

  it("positive while in grace", () => {
    const stats = makeStats({
      xp: 500,
      matches: [m({ won: true, playedAt: Date.now() - 1 * DAY })],
    });
    const d = daysUntilDecay(stats);
    expect(d).not.toBeNull();
    if (d !== null) expect(d).toBeGreaterThan(12);
  });
});
