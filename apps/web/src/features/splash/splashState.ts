/**
 * Splash gating — the user explicitly asked for an intro screen on every
 * fresh page visit. We intentionally do NOT cache a "seen" flag, so the
 * splash renders on every full page load and the user can still skip it
 * with a click or the ENTER button.
 */

export function splashSeen(): boolean {
  return false;
}
