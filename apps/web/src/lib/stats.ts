import type { Difficulty } from "./game/types";
import { DIFFICULTY_LABELS, DIFFICULTY_XP } from "./game/types";

/**
 * Local (browser-side) stats for the demo period — before contracts are
 * deployed we have nowhere on-chain to persist XP/history, so we shadow it
 * in localStorage. Once Phase 6 ships we'll keep using this as a cache in
 * front of the on-chain BotMatch ledger.
 */

export type MatchMode = "pve" | "pvp";

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  won: boolean;
  difficulty?: Difficulty; // pve only
  stakeEth?: string; // pvp only
  xpGained: number;
  playedAt: number; // epoch ms
}

export interface PlayerStats {
  xp: number;
  pveWins: number;
  pveLosses: number;
  pvpWins: number;
  pvpLosses: number;
  matches: MatchRecord[]; // most-recent first, capped
}

const EMPTY: PlayerStats = {
  xp: 0,
  pveWins: 0,
  pveLosses: 0,
  pvpWins: 0,
  pvpLosses: 0,
  matches: [],
};

const MAX_HISTORY = 50;
const KEY_PREFIX = "sea3battle:stats:";

function key(address?: string | null): string {
  return `${KEY_PREFIX}${(address ?? "guest").toLowerCase()}`;
}

export function loadStats(address?: string | null): PlayerStats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key(address));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as PlayerStats;
    return { ...EMPTY, ...parsed, matches: parsed.matches ?? [] };
  } catch {
    return EMPTY;
  }
}

export function saveStats(stats: PlayerStats, address?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(address), JSON.stringify(stats));
    // Notify listeners (Hud, Home, Profile, …) that local stats changed.
    window.dispatchEvent(new Event("stats:updated"));
  } catch {
    /* quota exceeded or blocked — ignore */
  }
}

export function recordMatch(
  address: string | null | undefined,
  input: Omit<MatchRecord, "id" | "playedAt" | "xpGained"> & { xpGained?: number },
): PlayerStats {
  const prev = loadStats(address);
  const xpGained =
    input.xpGained ??
    (input.won && input.mode === "pve" && input.difficulty !== undefined
      ? DIFFICULTY_XP[input.difficulty]
      : 0);

  const record: MatchRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode: input.mode,
    won: input.won,
    difficulty: input.difficulty,
    stakeEth: input.stakeEth,
    xpGained,
    playedAt: Date.now(),
  };

  const next: PlayerStats = {
    xp: prev.xp + xpGained,
    pveWins: prev.pveWins + (input.mode === "pve" && input.won ? 1 : 0),
    pveLosses: prev.pveLosses + (input.mode === "pve" && !input.won ? 1 : 0),
    pvpWins: prev.pvpWins + (input.mode === "pvp" && input.won ? 1 : 0),
    pvpLosses: prev.pvpLosses + (input.mode === "pvp" && !input.won ? 1 : 0),
    matches: [record, ...prev.matches].slice(0, MAX_HISTORY),
  };
  saveStats(next, address);
  return next;
}

export function clearStats(address?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(address));
}

export function describeMatch(m: MatchRecord): string {
  if (m.mode === "pve" && m.difficulty !== undefined) {
    return `${DIFFICULTY_LABELS[m.difficulty]} bot`;
  }
  if (m.mode === "pvp" && m.stakeEth) {
    return `PvP · ${m.stakeEth} ETH`;
  }
  return m.mode.toUpperCase();
}
