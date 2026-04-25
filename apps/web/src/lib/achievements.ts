import { useSyncExternalStore } from "react";
import { addCoins } from "./coins";

/**
 * Achievement catalogue + per-address progress store. Pure client-side
 * for MVP (localStorage). Emits `ach:updated` on progress change and
 * `ach:unlocked` on first unlock so the UI layer can render a toast.
 *
 * Coin rewards are credited synchronously on unlock via `addCoins`.
 */

export type AchievementId =
  | "firstBlood"
  | "firstWin"
  | "hundredMatches"
  | "fiveHundredMatches"
  | "tenWinStreak"
  | "ironFist"
  | "quickDraw"
  | "silentHunter"
  | "blindSeer"
  | "rankMatros"
  | "rankMichman"
  | "rankLieutenant"
  | "rankAdmiral"
  | "torpedoMaster"
  | "bombMaster"
  | "shieldBearer"
  | "collector"
  | "richCaptain"
  | "dailyRoutine"
  | "firstTryHard";

export interface AchievementDef {
  id: AchievementId;
  icon: string;
  titleKey: string;
  descKey: string;
  /** Coin payout when unlocked. */
  reward: number;
  /** Progress target — `1` means boolean flag. */
  target: number;
  /** Optional profile title awarded alongside the achievement. */
  titleBadge?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "firstBlood", icon: "🎯", titleKey: "ach.firstBlood.title", descKey: "ach.firstBlood.desc", reward: 10, target: 1 },
  { id: "firstWin", icon: "🏅", titleKey: "ach.firstWin.title", descKey: "ach.firstWin.desc", reward: 15, target: 1 },
  { id: "hundredMatches", icon: "⚓", titleKey: "ach.hundredMatches.title", descKey: "ach.hundredMatches.desc", reward: 100, target: 100 },
  { id: "fiveHundredMatches", icon: "🛡", titleKey: "ach.fiveHundredMatches.title", descKey: "ach.fiveHundredMatches.desc", reward: 300, target: 500 },
  { id: "tenWinStreak", icon: "🔥", titleKey: "ach.tenWinStreak.title", descKey: "ach.tenWinStreak.desc", reward: 200, target: 10, titleBadge: "ach.title.kraken" },
  { id: "ironFist", icon: "👊", titleKey: "ach.ironFist.title", descKey: "ach.ironFist.desc", reward: 100, target: 1 },
  { id: "quickDraw", icon: "⚡", titleKey: "ach.quickDraw.title", descKey: "ach.quickDraw.desc", reward: 100, target: 1 },
  { id: "silentHunter", icon: "🎭", titleKey: "ach.silentHunter.title", descKey: "ach.silentHunter.desc", reward: 150, target: 1, titleBadge: "ach.title.ghost" },
  { id: "blindSeer", icon: "🙈", titleKey: "ach.blindSeer.title", descKey: "ach.blindSeer.desc", reward: 75, target: 1 },
  { id: "rankMatros", icon: "⚓", titleKey: "ach.rankMatros.title", descKey: "ach.rankMatros.desc", reward: 20, target: 1 },
  { id: "rankMichman", icon: "🧭", titleKey: "ach.rankMichman.title", descKey: "ach.rankMichman.desc", reward: 60, target: 1 },
  { id: "rankLieutenant", icon: "⭐", titleKey: "ach.rankLieutenant.title", descKey: "ach.rankLieutenant.desc", reward: 150, target: 1 },
  { id: "rankAdmiral", icon: "👑", titleKey: "ach.rankAdmiral.title", descKey: "ach.rankAdmiral.desc", reward: 500, target: 1, titleBadge: "ach.title.admiral" },
  { id: "torpedoMaster", icon: "🚀", titleKey: "ach.torpedoMaster.title", descKey: "ach.torpedoMaster.desc", reward: 80, target: 10 },
  { id: "bombMaster", icon: "💣", titleKey: "ach.bombMaster.title", descKey: "ach.bombMaster.desc", reward: 80, target: 10 },
  { id: "shieldBearer", icon: "🛡", titleKey: "ach.shieldBearer.title", descKey: "ach.shieldBearer.desc", reward: 60, target: 5 },
  { id: "collector", icon: "🎁", titleKey: "ach.collector.title", descKey: "ach.collector.desc", reward: 50, target: 4 },
  { id: "richCaptain", icon: "💰", titleKey: "ach.richCaptain.title", descKey: "ach.richCaptain.desc", reward: 100, target: 1 },
  { id: "dailyRoutine", icon: "📅", titleKey: "ach.dailyRoutine.title", descKey: "ach.dailyRoutine.desc", reward: 100, target: 7 },
  { id: "firstTryHard", icon: "🌊", titleKey: "ach.firstTryHard.title", descKey: "ach.firstTryHard.desc", reward: 80, target: 1 },
];

const BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>;

export interface AchievementProgress {
  progress: number;
  unlockedAt: number | null;
}

export type AchievementState = Record<AchievementId, AchievementProgress>;

const KEY_PREFIX = "seabattle:ach:v1:";
const PURCHASED_KEY_PREFIX = "seabattle:ach:purchased:v1:";

function keyFor(address?: string | null): string {
  return `${KEY_PREFIX}${(address ?? "guest").toLowerCase()}`;
}

function purchasedKeyFor(address?: string | null): string {
  return `${PURCHASED_KEY_PREFIX}${(address ?? "guest").toLowerCase()}`;
}

function emptyState(): AchievementState {
  const out = {} as AchievementState;
  for (const a of ACHIEVEMENTS) out[a.id] = { progress: 0, unlockedAt: null };
  return out;
}

export function loadAchievements(address?: string | null): AchievementState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(keyFor(address));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AchievementState>;
    const full = emptyState();
    for (const id of Object.keys(full) as AchievementId[]) {
      const p = parsed[id];
      if (p) full[id] = { progress: p.progress ?? 0, unlockedAt: p.unlockedAt ?? null };
    }
    return full;
  } catch {
    return emptyState();
  }
}

function save(address: string | null | undefined, state: AchievementState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(address), JSON.stringify(state));
    snapshotCache.set(keyFor(address), {
      raw: window.localStorage.getItem(keyFor(address)),
      state,
    });
    window.dispatchEvent(new Event("ach:updated"));
  } catch {
    /* quota exceeded */
  }
}

/**
 * Set or raise a progress value. If this unlocks a new achievement,
 * credit the coin reward and fire an `ach:unlocked` event.
 *
 * Progress is monotonic — calls with a lower value than current are
 * ignored, so repeated "count" calls are safe.
 */
export function recordProgress(
  address: string | null | undefined,
  id: AchievementId,
  value: number,
): boolean {
  const def = BY_ID[id];
  if (!def) return false;
  const state = loadAchievements(address);
  const current = state[id];
  if (current.unlockedAt) return false;

  const nextProgress = Math.max(current.progress, value);
  const justUnlocked = nextProgress >= def.target;
  state[id] = {
    progress: Math.min(nextProgress, def.target),
    unlockedAt: justUnlocked ? Date.now() : null,
  };
  save(address, state);

  if (justUnlocked) {
    addCoins(def.reward, address);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ach:unlocked", { detail: { id, reward: def.reward } }),
      );
    }
  }
  return justUnlocked;
}

/** Increment a counting achievement by `delta` (default 1). */
export function addProgress(
  address: string | null | undefined,
  id: AchievementId,
  delta: number = 1,
): boolean {
  const state = loadAchievements(address);
  return recordProgress(address, id, state[id].progress + delta);
}

/** Flag an achievement as unlocked iff `cond` is true. */
export function markIf(
  address: string | null | undefined,
  id: AchievementId,
  cond: boolean,
): boolean {
  if (!cond) return false;
  return recordProgress(address, id, BY_ID[id].target);
}

/**
 * Track distinct powerup SKUs purchased — used by the "Collector"
 * achievement. Stored as a JSON set per-address so we count unique IDs.
 */
export function recordPurchase(
  address: string | null | undefined,
  powerupId: string,
): void {
  if (typeof window === "undefined") return;
  let set: Set<string>;
  try {
    const raw = window.localStorage.getItem(purchasedKeyFor(address));
    set = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    set = new Set();
  }
  if (!set.has(powerupId)) {
    set.add(powerupId);
    window.localStorage.setItem(purchasedKeyFor(address), JSON.stringify([...set]));
  }
  recordProgress(address, "collector", set.size);
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const l = () => cb();
  window.addEventListener("ach:updated", l);
  return () => window.removeEventListener("ach:updated", l);
}

// Snapshot cache so useSyncExternalStore's getSnapshot returns a stable
// reference between renders when the underlying localStorage row is
// unchanged. Keyed by storage key so multiple addresses can be observed.
const snapshotCache = new Map<string, { raw: string | null; state: AchievementState }>();

function getSnapshot(address: string | null | undefined): AchievementState {
  const k = keyFor(address);
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(k);
  const cached = snapshotCache.get(k);
  if (cached && cached.raw === raw) return cached.state;
  const state = loadAchievements(address);
  snapshotCache.set(k, { raw, state });
  return state;
}

const SSR_SNAPSHOT = emptyState();

/** Reactive read of the achievements map for a given address. */
export function useAchievements(address: string | null | undefined): AchievementState {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(address),
    () => SSR_SNAPSHOT,
  );
}

export function getDef(id: AchievementId): AchievementDef {
  return BY_ID[id];
}

export function unlockedCount(state: AchievementState): number {
  let n = 0;
  for (const id of Object.keys(state) as AchievementId[]) {
    if (state[id].unlockedAt) n++;
  }
  return n;
}

/** Test hook — wipes all ach state for the current address. */
export function resetAchievements(address?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(address));
  window.localStorage.removeItem(purchasedKeyFor(address));
  snapshotCache.delete(keyFor(address));
  window.dispatchEvent(new Event("ach:updated"));
}
