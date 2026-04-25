import { beforeEach, describe, expect, it } from "vitest";
import {
  COINS_REWARD,
  __resetCoinsMigration,
  addCoins,
  grantPveReward,
  loadCoins,
  migrateCoins,
  saveCoins,
  spendCoins,
} from "./coins";

const A = "0xabcd000000000000000000000000000000000001";
const B = "0xabcd000000000000000000000000000000000002";

describe("coins store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts at zero for a fresh address", () => {
    expect(loadCoins(A)).toBe(0);
  });

  it("add / save / load round-trip", () => {
    addCoins(50, A);
    addCoins(25, A);
    expect(loadCoins(A)).toBe(75);
    saveCoins(10, A);
    expect(loadCoins(A)).toBe(10);
  });

  it("keeps balances isolated per address", () => {
    addCoins(40, A);
    addCoins(7, B);
    expect(loadCoins(A)).toBe(40);
    expect(loadCoins(B)).toBe(7);
  });

  it("spend succeeds when affordable and fails gracefully otherwise", () => {
    addCoins(30, A);
    const ok = spendCoins(25, A);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.balance).toBe(5);

    const no = spendCoins(100, A);
    expect(no.ok).toBe(false);
    if (!no.ok) {
      expect(no.reason).toBe("insufficient-coins");
      expect(no.need).toBe(100);
      expect(no.balance).toBe(5);
    }
    // No side effects on failed spend.
    expect(loadCoins(A)).toBe(5);
  });

  it("ignores non-positive add", () => {
    addCoins(-10, A);
    addCoins(0, A);
    expect(loadCoins(A)).toBe(0);
  });
});

describe("coin migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("grants 10% of current XP up to the cap on first call", () => {
    const granted = migrateCoins(500, A);
    expect(granted).toBe(50);
    expect(loadCoins(A)).toBe(50);
  });

  it("caps the returning-player grant", () => {
    const granted = migrateCoins(5000, A);
    expect(granted).toBe(200);
    expect(loadCoins(A)).toBe(200);
  });

  it("gives fresh wallets a flat starter", () => {
    const granted = migrateCoins(0, A);
    expect(granted).toBe(20);
    expect(loadCoins(A)).toBe(20);
  });

  it("is idempotent — second call is a no-op", () => {
    migrateCoins(1000, A);
    const again = migrateCoins(1000, A);
    expect(again).toBe(0);
    expect(loadCoins(A)).toBe(100);
  });

  it("can be reset in tests", () => {
    migrateCoins(1000, A);
    __resetCoinsMigration(A);
    const granted = migrateCoins(1000, A);
    expect(granted).toBe(100);
  });
});

describe("grantPveReward", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("no reward on loss", () => {
    const delta = grantPveReward(A, false, 2, 0);
    expect(delta).toBe(0);
    expect(loadCoins(A)).toBe(0);
  });

  it("pays per difficulty", () => {
    grantPveReward(A, true, 0, 1);
    grantPveReward(A, true, 1, 1);
    grantPveReward(A, true, 2, 1);
    expect(loadCoins(A)).toBe(
      COINS_REWARD.pveEasy + COINS_REWARD.pveNormal + COINS_REWARD.pveHard,
    );
  });

  it("adds the 3-win streak bonus", () => {
    const delta = grantPveReward(A, true, 1, 3);
    expect(delta).toBe(COINS_REWARD.pveNormal + COINS_REWARD.streakBonus3);
  });

  it("adds the 5-win streak bonus at every multiple of 5", () => {
    const a5 = grantPveReward(A, true, 1, 5);
    expect(a5).toBe(COINS_REWARD.pveNormal + COINS_REWARD.streakBonus5);
    const a10 = grantPveReward(A, true, 1, 10);
    expect(a10).toBe(COINS_REWARD.pveNormal + COINS_REWARD.streakBonus5);
  });
});
