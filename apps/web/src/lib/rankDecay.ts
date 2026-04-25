/**
 * XP rank decay for inactivity and loss streaks.
 *
 * Design (from the gameplay brief):
 *  - If the player has not played a match for >= INACTIVITY_GRACE_DAYS,
 *    they bleed DECAY_PER_WEEK XP per full week since the grace period
 *    started. Playing any match resets the clock.
 *  - A losing streak of >= STREAK_THRESHOLD losses in a row (no win since)
 *    applies a penalty scaling with the current rank. The penalty is
 *    applied once per loss by the match result handler — this file just
 *    exposes the helper.
 *  - No rank can ever fall below FLOOR_XP (current: Матрос = 100 XP).
 *
 * This module is **pure**: callers pass in a stats snapshot, get back a
 * proposed delta, and decide whether/how to persist. PveScreen and the
 * AppInner bootstrapper call it.
 */

import type { PlayerStats } from "./stats";

export const INACTIVITY_GRACE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DECAY_PER_WEEK = 50;
export const STREAK_THRESHOLD = 3;
export const FLOOR_XP = 100; // Матрос — can't fall below once passed

/**
 * Return the XP loss that should be applied right now due to inactivity.
 * Returns 0 when the player is within the grace window or has never played.
 *
 * Caller is responsible for applying the delta AND updating a marker so the
 * same elapsed time is not charged twice. Marker = timestamp of the most
 * recent match OR, if the decay clock has already started, a shifted cursor.
 */
export function pendingInactivityDecay(
  stats: PlayerStats,
  now: number = Date.now(),
): { loss: number; sinceMs: number } {
  if (stats.xp <= FLOOR_XP) return { loss: 0, sinceMs: 0 };
  const last = stats.matches[0]?.playedAt ?? 0;
  if (last <= 0) return { loss: 0, sinceMs: 0 };
  const elapsed = now - last;
  if (elapsed <= INACTIVITY_GRACE_MS) return { loss: 0, sinceMs: elapsed };
  const overdue = elapsed - INACTIVITY_GRACE_MS;
  const weeks = Math.floor(overdue / WEEK_MS);
  if (weeks <= 0) return { loss: 0, sinceMs: elapsed };
  const raw = weeks * DECAY_PER_WEEK;
  const ceiling = Math.max(0, stats.xp - FLOOR_XP);
  return { loss: Math.min(raw, ceiling), sinceMs: elapsed };
}

/**
 * Count the number of consecutive losses in the most recent matches (any
 * mode). Resets on the first win. Returns 0 if the last match was a win or
 * there is no history.
 */
export function currentLossStreak(stats: PlayerStats): number {
  let count = 0;
  for (const m of stats.matches) {
    if (m.won) break;
    count++;
  }
  return count;
}

/**
 * Penalty to apply after a fresh loss that brings streak >= STREAK_THRESHOLD.
 * Scales with current XP bracket so the same streak hurts more at higher
 * ranks.
 */
export function lossStreakPenalty(xpBefore: number): number {
  if (xpBefore < 100) return 10; // Юнга
  if (xpBefore < 500) return 25; // Матрос
  if (xpBefore < 1500) return 50; // Боцман
  if (xpBefore < 3000) return 100; // Мичман
  if (xpBefore < 6000) return 200; // Лейтенант
  if (xpBefore < 10000) return 300; // Капитан-лейтенант
  if (xpBefore < 20000) return 400; // Капитан
  return 500; // Адмирал
}

/** Clamp XP change so we never dip below the floor once we've cleared it. */
export function applyXpDelta(xpBefore: number, delta: number): number {
  const next = xpBefore + delta;
  if (xpBefore >= FLOOR_XP) return Math.max(FLOOR_XP, next);
  return Math.max(0, next);
}

/**
 * Days remaining until inactivity decay kicks in. Negative if already past
 * the grace period. Null when there is no match history.
 */
export function daysUntilDecay(
  stats: PlayerStats,
  now: number = Date.now(),
): number | null {
  const last = stats.matches[0]?.playedAt ?? 0;
  if (last <= 0) return null;
  const remaining = INACTIVITY_GRACE_MS - (now - last);
  return remaining / (24 * 60 * 60 * 1000);
}
