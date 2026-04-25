import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  addProgress,
  loadAchievements,
  markIf,
  recordProgress,
  recordPurchase,
  resetAchievements,
  unlockedCount,
} from "./achievements";
import { __resetCoinsMigration, loadCoins } from "./coins";

const ADDR = "0xabc";

beforeEach(() => {
  resetAchievements(ADDR);
  __resetCoinsMigration(ADDR);
});

afterEach(() => {
  resetAchievements(ADDR);
  __resetCoinsMigration(ADDR);
});

describe("achievements store", () => {
  it("starts empty", () => {
    const s = loadAchievements(ADDR);
    expect(unlockedCount(s)).toBe(0);
    for (const def of ACHIEVEMENTS) {
      expect(s[def.id].progress).toBe(0);
      expect(s[def.id].unlockedAt).toBeNull();
    }
  });

  it("marks a flag and credits coins on first unlock only", () => {
    expect(markIf(ADDR, "firstBlood", true)).toBe(true);
    expect(loadCoins(ADDR)).toBe(10);
    expect(markIf(ADDR, "firstBlood", true)).toBe(false);
    expect(loadCoins(ADDR)).toBe(10);
  });

  it("counts progress monotonically without crossing the target", () => {
    addProgress(ADDR, "torpedoMaster");
    addProgress(ADDR, "torpedoMaster");
    expect(loadAchievements(ADDR).torpedoMaster.progress).toBe(2);
    expect(loadAchievements(ADDR).torpedoMaster.unlockedAt).toBeNull();
  });

  it("unlocks once progress hits target and stops counting after", () => {
    for (let i = 0; i < 10; i++) addProgress(ADDR, "torpedoMaster");
    const s = loadAchievements(ADDR);
    expect(s.torpedoMaster.progress).toBe(10);
    expect(s.torpedoMaster.unlockedAt).not.toBeNull();
    expect(loadCoins(ADDR)).toBe(80);
    addProgress(ADDR, "torpedoMaster");
    expect(loadAchievements(ADDR).torpedoMaster.progress).toBe(10);
    expect(loadCoins(ADDR)).toBe(80);
  });

  it("collector counts distinct powerup SKUs", () => {
    recordPurchase(ADDR, "bomb");
    recordPurchase(ADDR, "bomb");
    expect(loadAchievements(ADDR).collector.progress).toBe(1);
    recordPurchase(ADDR, "radar");
    recordPurchase(ADDR, "torpedo");
    recordPurchase(ADDR, "shield");
    const s = loadAchievements(ADDR);
    expect(s.collector.unlockedAt).not.toBeNull();
    expect(s.collector.progress).toBe(4);
  });

  it("recordProgress is monotonic — lower values are ignored", () => {
    recordProgress(ADDR, "hundredMatches", 50);
    recordProgress(ADDR, "hundredMatches", 10);
    expect(loadAchievements(ADDR).hundredMatches.progress).toBe(50);
  });

  it("emits an ach:unlocked event on first unlock", () => {
    const ids: string[] = [];
    const handler = (e: Event) => {
      ids.push((e as CustomEvent<{ id: string }>).detail.id);
    };
    window.addEventListener("ach:unlocked", handler as EventListener);
    markIf(ADDR, "firstWin", true);
    markIf(ADDR, "firstWin", true);
    window.removeEventListener("ach:unlocked", handler as EventListener);
    expect(ids).toEqual(["firstWin"]);
  });
});
