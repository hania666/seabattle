/**
 * Power-ups (bombs / radars / torpedoes / shields) — local-only inventory.
 * Balance of coins lives in `./coins`; inventory and daily-claim marker
 * live here. Both are keyed by wallet address (or "guest").
 *
 * Phase 7 migration: when we deploy a PowerUps ERC-1155 contract, these
 * balances become an off-chain cache in front of `balanceOf(account, id)`.
 */

import { COINS_REWARD, addCoins, spendCoins, type SpendResult } from "./coins";
import { addProgress, recordPurchase } from "./achievements";

export type PowerupId = "bomb" | "radar" | "torpedo" | "shield";

export interface PowerupDef {
  id: PowerupId;
  cost: number; // coins
  icon: string;
}

export const POWERUPS: PowerupDef[] = [
  { id: "bomb", cost: 60, icon: "💣" },
  { id: "radar", cost: 50, icon: "📡" },
  { id: "torpedo", cost: 150, icon: "🚀" },
  { id: "shield", cost: 120, icon: "🛡" },
];

/**
 * Per-powerup inventory cap. Prevents stockpiling so a free-PvE grind
 * can't translate into a guaranteed PvP win via overwhelming firepower.
 * Anything purchased above the cap is rejected without spending coins.
 */
export const INVENTORY_CAP: Record<PowerupId, number> = {
  bomb: 5,
  radar: 5,
  torpedo: 5,
  shield: 5,
};

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
  | { ok: false; reason: "insufficient-coins"; need: number; have: number }
  | { ok: false; reason: "inventory-full"; cap: number }
  | { ok: false; reason: "unknown" };

export function purchasePowerup(
  address: string | null | undefined,
  id: PowerupId,
): PurchaseResult {
  const def = POWERUPS.find((p) => p.id === id);
  if (!def) return { ok: false, reason: "unknown" };
  // Refuse before spending coins so a full inventory doesn't cost the
  // buyer anything.
  const pre = loadPowerupState(address);
  const cap = INVENTORY_CAP[id];
  if (pre.inventory[id] >= cap) {
    return { ok: false, reason: "inventory-full", cap };
  }
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
  recordPurchase(address, id);
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
  if (id === "bomb") addProgress(address, "bombMaster");
  else if (id === "torpedo") addProgress(address, "torpedoMaster");
  else if (id === "shield") addProgress(address, "shieldBearer");
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

export interface DailyClaimResult {
  claimed: boolean;
  bombAdded: boolean;
  radarAdded: boolean;
  coinsAdded: number;
}

export function claimDaily(address: string | null | undefined): DailyClaimResult {
  const state = loadPowerupState(address);
  if (!canClaimDaily(state)) {
    return { claimed: false, bombAdded: false, radarAdded: false, coinsAdded: 0 };
  }
  // Clamp to cap so a maxed-out inventory doesn't quietly exceed the limit.
  // Coins + cooldown still tick — the daily slot was used.
  const bombAdded = state.inventory.bomb < INVENTORY_CAP.bomb;
  const radarAdded = state.inventory.radar < INVENTORY_CAP.radar;
  if (bombAdded) state.inventory.bomb += 1;
  if (radarAdded) state.inventory.radar += 1;
  state.lastDailyClaim = Date.now();
  save(address, state);
  addCoins(COINS_REWARD.dailyCrate, address);
  addProgress(address, "dailyRoutine");
  return {
    claimed: true,
    bombAdded,
    radarAdded,
    coinsAdded: COINS_REWARD.dailyCrate,
  };
}

/**
 * Award after a win — common drop (bomb/radar). Called from PvE/PvP finish
 * handlers. Kept separate from daily so both can trigger.
 *
 * Skips powerups already at cap so wins can't push past the limit. If every
 * slot in the random pool is full, returns null (no drop).
 */
export function grantWinDrop(address: string | null | undefined): PowerupId | null {
  const state = loadPowerupState(address);
  const pool: PowerupId[] = ["bomb", "radar", "bomb", "radar", "torpedo"];
  const eligible = pool.filter((id) => state.inventory[id] < INVENTORY_CAP[id]);
  if (eligible.length === 0) return null;
  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  state.inventory[pick] += 1;
  save(address, state);
  return pick;
}
