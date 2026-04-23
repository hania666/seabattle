/**
 * One-shot startup tasks run when the wallet identity resolves:
 *  1) Grant the one-time Coins welcome bonus (migration from XP-only era).
 *  2) Charge pending inactivity decay, if any, and shift the marker so we
 *     don't double-charge on the next reload.
 *
 * Runs in an effect inside App, keyed off `address`. Idempotent per address.
 */

import { loadStats, saveStats } from "./stats";
import { migrateCoins } from "./coins";
import {
  INACTIVITY_GRACE_MS,
  WEEK_MS,
  applyXpDelta,
  pendingInactivityDecay,
} from "./rankDecay";

export interface BootstrapResult {
  coinsGranted: number;
  decayCharged: number;
}

export function runBootstrap(address?: string | null): BootstrapResult {
  const stats = loadStats(address);
  const coinsGranted = migrateCoins(stats.xp, address);

  const decay = pendingInactivityDecay(stats);
  let decayCharged = 0;
  if (decay.loss > 0) {
    const nextXp = applyXpDelta(stats.xp, -decay.loss);
    decayCharged = stats.xp - nextXp;
    // Advance the most recent match's timestamp forward by `weeks * WEEK_MS`
    // so the decay window shifts — playing resets cleanly, while sitting
    // idle keeps decay accruing one week at a time.
    const weeks = Math.floor(decayCharged / 50); // DECAY_PER_WEEK
    const shifted = [...stats.matches];
    if (shifted[0]) {
      shifted[0] = {
        ...shifted[0],
        playedAt: shifted[0].playedAt + weeks * WEEK_MS,
      };
    }
    saveStats({ ...stats, xp: nextXp, matches: shifted }, address);
  }
  return { coinsGranted, decayCharged };
}

/** Pure variant for tests / profile preview — no side effects. */
export function previewBootstrap(
  address?: string | null,
  now: number = Date.now(),
): { daysUntilDecay: number | null; pendingDecay: number } {
  const stats = loadStats(address);
  const decay = pendingInactivityDecay(stats, now);
  const last = stats.matches[0]?.playedAt ?? 0;
  const daysUntil = last
    ? (INACTIVITY_GRACE_MS - (now - last)) / (24 * 60 * 60 * 1000)
    : null;
  return { daysUntilDecay: daysUntil, pendingDecay: decay.loss };
}
