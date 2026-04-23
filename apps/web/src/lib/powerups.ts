/**
 * Power-ups (bombs / radars / torpedoes / shields) — local-only inventory.
 * Balance of coins lives in `./coins`; inventory and daily-claim marker
 * live here. Both are keyed by wallet address (or "guest").
 *
 * Phase 7 migration: when we deploy a PowerUps ERC-1155 contract, these
 * balances become an off-chain cache in front of `balanceOf(account, id)`.
 */

import { spendCoins, type SpendResult } from "./coins";

export type PowerupId = "bomb" | "radar" | "torpedo" | "shield";

export interface PowerupDef {
  id: PowerupId;
  cost: number; // coins
  icon: string;
}

export const POWERUPS: PowerupDef[] = [
  { id: "bomb", cost: 20, icon: "💣" },
  { id: "radar", cost: 15, icon: "📡" },
  { id: "torpedo", cost: 50, icon: "🚀" },
  { id: "shield", cost: 40, icon: "🛡" },
];

export type Inventory = Record<PowerupId, number>;

export interface PowerupState {
  inventory: Inventory;
  lastDailyClaim: number; // unix ms, 0 = never
}

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = "sea3battle:powerups:v1";

function key(address?: string | null): string {
  const who = address ? address.toLowerCase() : "guest";
  return `${KEY_PREFIX}:${who}`;
}

const EMPTY: PowerupState = {
  inventory: { bomb: 0, radar: 0, torpedo: 0, shield: 0 },
  lastDailyClaim: 0,
};

export function loadPowerupState(address?: string | null): PowerupState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key(address));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PowerupState>;
    return {
      inventory: {
        bomb: Math.max(0, parsed.inventory?.bomb ?? 0),
        radar: Math.max(0, parsed.inventory?.radar ?? 0),
        torpedo: Math.max(0, parsed.inventory?.torpedo ?? 0),
        shield: Math.max(0, parsed.inventory?.shield ?? 0),
      },
      lastDailyClaim: Math.max(0, parsed.lastDailyClaim ?? 0),
    };
  } catch {
    return EMPTY;
  }
}

function save(address: string | null | undefined, state: PowerupState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(address), JSON.stringify(state));
    window.dispatchEvent(new Event("powerups:updated"));
  } catch {
    /* ignore */
  }
}

export type PurchaseResult =
  | { ok: true; coinsLeft: number }
  | { ok: false; reason: "insufficient-coins" | "unknown"; need?: number; have?: number };

export function purchasePowerup(
  address: string | null | undefined,
  id: PowerupId,
): PurchaseResult {
  const def = POWERUPS.find((p) => p.id === id);
  if (!def) return { ok: false, reason: "unknown" };
  const spend: SpendResult = spendCoins(def.cost, address);
  if (!spend.ok) {
    return {
      ok: false,
      reason: "insufficient-coins",
      need: def.cost,
      have: spend.balance,
    };
  }
  const state = loadPowerupState(address);
  state.inventory[id] += 1;
  save(address, state);
  return { ok: true, coinsLeft: spend.balance };
}

export function consumePowerup(
  address: string | null | undefined,
  id: PowerupId,
): boolean {
  const state = loadPowerupState(address);
  if (state.inventory[id] <= 0) return false;
  state.inventory[id] -= 1;
  save(address, state);
  return true;
}

/**
 * Daily claim — grants 1 Bomb + 1 Radar every 24 hours.
 */
export function canClaimDaily(state: PowerupState): boolean {
  return Date.now() - state.lastDailyClaim >= DAILY_COOLDOWN_MS;
}

export function dailyClaimRemainingMs(state: PowerupState): number {
  return Math.max(0, DAILY_COOLDOWN_MS - (Date.now() - state.lastDailyClaim));
}

export function claimDaily(address: string | null | undefined): boolean {
  const state = loadPowerupState(address);
  if (!canClaimDaily(state)) return false;
  state.inventory.bomb += 1;
  state.inventory.radar += 1;
  state.lastDailyClaim = Date.now();
  save(address, state);
  // Daily crate also drops coins (see COINS_REWARD.dailyCrate).
  // Imported lazily to avoid a cycle since coins.ts doesn't depend on powerups.
  void import("./coins").then(({ addCoins, COINS_REWARD }) => {
    addCoins(COINS_REWARD.dailyCrate, address);
  });
  return true;
}

/**
 * Award after a win — common drop (bomb/radar). Called from PvE/PvP finish
 * handlers. Kept separate from daily so both can trigger.
 */
export function grantWinDrop(address: string | null | undefined): PowerupId | null {
  const state = loadPowerupState(address);
  const pool: PowerupId[] = ["bomb", "radar", "bomb", "radar", "torpedo"];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.inventory[pick] += 1;
  save(address, state);
  return pick;
}
