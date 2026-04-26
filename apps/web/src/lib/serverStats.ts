/**
 * Client-side bridge to the server's `/api/stats/me` endpoints.
 *
 * Today this is a thin wrapper that runs after a successful SIWE sign-in
 * and reconciles the player's localStorage stats with the server row:
 *
 *   1. Read what's in localStorage (`loadStats`/`readCoins`).
 *   2. POST a `ClientStats` blob to `/api/stats/me/sync`. The server takes
 *      `MAX(server, client)` for every counter and returns the merged row.
 *   3. Write the merged values back to localStorage so the UI reflects
 *      whatever was bigger (a returning player who's been farming on the
 *      server doesn't lose progress when they switch browsers).
 *
 * The hook stays a no-op until the user is authenticated, so unsigned
 * sessions still work entirely offline.
 */
import { SERVER_URL } from "./socket";
import { loadStats, saveStats, type PlayerStats } from "./stats";
import { loadCoins, saveCoins } from "./coins";
import type { AuthedFetch } from "./useAuth";

export interface ClientStatsPayload {
  xp: number;
  coins: number;
  pveWins: number;
  pveLosses: number;
  pvpWins: number;
  pvpLosses: number;
  longestWinStreak: number;
}

export interface ServerStatsPayload extends ClientStatsPayload {
  wallet: string;
  currentWinStreak: number;
  lastMatchAt: number | null;
  updatedAt: number;
}

function readLocalSnapshot(address: string): ClientStatsPayload {
  const stats = loadStats(address);
  const coins = loadCoins(address);
  // `longestWinStreak` isn't tracked locally yet — we send 0 so the server
  // never drops its own value. Once we start writing it we'll feed it here.
  return {
    xp: stats.xp,
    coins,
    pveWins: stats.pveWins,
    pveLosses: stats.pveLosses,
    pvpWins: stats.pvpWins,
    pvpLosses: stats.pvpLosses,
    longestWinStreak: 0,
  };
}

function writeBackToLocal(address: string, server: ServerStatsPayload): void {
  const local: PlayerStats = loadStats(address);
  // Server is authoritative on counters but doesn't track per-match history,
  // so we only overwrite the aggregate fields and keep the local matches log.
  saveStats(
    {
      xp: Math.max(local.xp, server.xp),
      pveWins: Math.max(local.pveWins, server.pveWins),
      pveLosses: Math.max(local.pveLosses, server.pveLosses),
      pvpWins: Math.max(local.pvpWins, server.pvpWins),
      pvpLosses: Math.max(local.pvpLosses, server.pvpLosses),
      matches: local.matches,
    },
    address,
  );
  saveCoins(Math.max(loadCoins(address), server.coins), address);
}

/**
 * Push `address`'s localStorage stats to the server, then write the merged
 * row back to localStorage. Returns the server response, or `null` if the
 * call failed (network error, 401, 5xx). Failures are intentionally silent
 * — the local state stays the same and the user can keep playing.
 */
export async function syncStatsAfterSignIn(
  address: string,
  fetch: AuthedFetch,
): Promise<ServerStatsPayload | null> {
  const payload = readLocalSnapshot(address);
  try {
    const res = await fetch(`${SERVER_URL}/api/stats/me/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stats: ServerStatsPayload };
    if (!body.stats) return null;
    writeBackToLocal(address, body.stats);
    return body.stats;
  } catch {
    return null;
  }
}
