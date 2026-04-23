/**
 * In-game currency ("Coins") — independent of XP.
 *
 * XP remains the rank ladder signal and never decreases in normal play.
 * Coins are earned from matches and spent in the shop. Stored per wallet
 * address (or "guest") in localStorage, same pattern as stats/powerups.
 *
 * Migration note: on first load after the coins feature lands we grant a
 * one-time welcome bonus equal to 10% of the player's current XP, capped at
 * MIGRATION_MAX. That way existing players don't walk into an empty shop.
 * The grant flag is stored per-address; fresh addresses get MIGRATION_FRESH.
 */

import { useSyncExternalStore } from "react";

const KEY_PREFIX = "seabattle:coins:v1";
const MIGRATION_FLAG = "seabattle:coins:migrated:v1";

const MIGRATION_PCT = 0.1; // 10% of current XP
const MIGRATION_MAX = 200; // cap for returning players
const MIGRATION_FRESH = 20; // brand-new wallets

function key(address?: string | null): string {
  const who = address ? address.toLowerCase() : "guest";
  return `${KEY_PREFIX}:${who}`;
}

function flagKey(address?: string | null): string {
  const who = address ? address.toLowerCase() : "guest";
  return `${MIGRATION_FLAG}:${who}`;
}

function safeRead(k: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeWrite(k: string, v: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("coins:updated"));
  }
}

export function loadCoins(address?: string | null): number {
  const raw = safeRead(key(address));
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function saveCoins(amount: number, address?: string | null): void {
  safeWrite(key(address), String(Math.max(0, Math.floor(amount))));
  notify();
}

export function addCoins(amount: number, address?: string | null): number {
  if (amount <= 0) return loadCoins(address);
  const next = loadCoins(address) + Math.floor(amount);
  saveCoins(next, address);
  return next;
}

export type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient-coins"; balance: number; need: number };

export function spendCoins(
  amount: number,
  address?: string | null,
): SpendResult {
  const balance = loadCoins(address);
  if (balance < amount) {
    return { ok: false, reason: "insufficient-coins", balance, need: amount };
  }
  const next = balance - amount;
  saveCoins(next, address);
  return { ok: true, balance: next };
}

/**
 * Run once per address per device. Grants a welcome bonus; idempotent.
 * Returns the granted amount (0 if already migrated).
 */
export function migrateCoins(
  xp: number,
  address?: string | null,
): number {
  if (safeRead(flagKey(address))) return 0;
  const grant =
    xp > 0
      ? Math.min(MIGRATION_MAX, Math.floor(xp * MIGRATION_PCT))
      : MIGRATION_FRESH;
  if (grant > 0) addCoins(grant, address);
  safeWrite(flagKey(address), String(Date.now()));
  return grant;
}

/** Reset migration flag (used in tests). */
export function __resetCoinsMigration(address?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(flagKey(address));
    window.localStorage.removeItem(key(address));
  } catch {
    /* ignore */
  }
}

// ---- React subscription ----

type Listener = () => void;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  window.addEventListener("coins:updated", () => {
    listeners.forEach((fn) => fn());
  });
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * React hook: reactive coin balance for the given address.
 *
 * Note: re-renders when ANY coin event fires (not filtered by address), but
 * re-reads the correct per-address value each time, so the subscriber still
 * gets accurate output.
 */
export function useCoins(address?: string | null): number {
  return useSyncExternalStore(
    subscribe,
    () => loadCoins(address),
    () => 0,
  );
}

// ---- Reward table (used by PvE/PvP result handlers) ----

export const COINS_REWARD = {
  pveEasy: 5,
  pveNormal: 15,
  pveHard: 30,
  pvpWin: 0, // PvP pays in ETH, no coin award (keeps arbitrage minimal)
  streakBonus3: 20,
  streakBonus5: 50,
  dailyCrate: 5,
} as const;

/**
 * Compute and apply the coin reward for a finished PvE match.
 * Returns the delta (0 if loss, positive on win).
 *
 * @param difficulty 0=Easy, 1=Normal, 2=Hard (matches Difficulty enum)
 * @param winStreak  wins-in-a-row count AFTER counting this match
 */
export function grantPveReward(
  address: string | null | undefined,
  won: boolean,
  difficulty: 0 | 1 | 2,
  winStreak: number,
): number {
  if (!won) return 0;
  let delta = 0;
  if (difficulty === 0) delta = COINS_REWARD.pveEasy;
  else if (difficulty === 1) delta = COINS_REWARD.pveNormal;
  else delta = COINS_REWARD.pveHard;
  if (winStreak >= 5 && winStreak % 5 === 0) delta += COINS_REWARD.streakBonus5;
  else if (winStreak === 3) delta += COINS_REWARD.streakBonus3;
  addCoins(delta, address);
  return delta;
}
