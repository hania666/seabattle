/**
 * Stats sync helpers — the first server-authoritative state move from
 * localStorage to Postgres. Two operations are exposed:
 *
 *   - `loadStatsForWallet(wallet)` returns the stored row in a JSON-friendly
 *     shape (no `Date` objects) so it round-trips cleanly through Express.
 *   - `mergeStats(wallet, client)` performs an idempotent **monotonic merge**:
 *     for each counter, the server stores `MAX(server, client)`. Clients can
 *     submit their localStorage values repeatedly without rolling history
 *     backwards. This is the bridge during the migration window — once Phase
 *     8.6 ships, mutations will go through purpose-built endpoints (e.g. a
 *     match-result endpoint) and clients will read state down rather than
 *     pushing it up.
 *
 * Why MAX instead of SUM/REPLACE?
 *   - SUM would double-count if a client retries.
 *   - REPLACE would let a tampered localStorage erase legitimate progress.
 *   - MAX handles both cases. The cost is that we trust the *largest* counter
 *     ever submitted, which is acceptable while we're using this only as a
 *     migration shim. Phase 8.6's anti-cheat layer (full PvE move-log
 *     validation) replaces this trust assumption with real verification.
 */
import { getOrCreateUser, getStats, normaliseWallet, query, type StatsRow } from "./db";

/** A cap that prevents accidental BIGINT-style numbers from the client. */
const MAX_COUNTER = 1_000_000;

export interface ClientStats {
  xp: number;
  coins: number;
  pveWins: number;
  pveLosses: number;
  pvpWins: number;
  pvpLosses: number;
  longestWinStreak: number;
}

export interface ServerStats extends ClientStats {
  wallet: string;
  currentWinStreak: number;
  lastMatchAt: number | null;
  updatedAt: number;
}

function rowToServerStats(row: StatsRow): ServerStats {
  return {
    wallet: row.wallet,
    xp: row.xp,
    coins: row.coins,
    pveWins: row.pve_wins,
    pveLosses: row.pve_losses,
    pvpWins: row.pvp_wins,
    pvpLosses: row.pvp_losses,
    longestWinStreak: row.longest_win_streak,
    currentWinStreak: row.current_win_streak,
    lastMatchAt: row.last_match_at ? row.last_match_at.getTime() : null,
    updatedAt: row.updated_at.getTime(),
  };
}

export async function loadStatsForWallet(rawWallet: string): Promise<ServerStats | null> {
  const wallet = normaliseWallet(rawWallet);
  const row = await getStats(wallet);
  if (!row) return null;
  return rowToServerStats(row);
}

export class StatsValidationError extends Error {
  constructor(public readonly field: string) {
    super(`invalid value for ${field}`);
    this.name = "StatsValidationError";
  }
}

function validCounter(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StatsValidationError(field);
  }
  if (value < 0 || value > MAX_COUNTER || !Number.isInteger(value)) {
    throw new StatsValidationError(field);
  }
  return value;
}

/**
 * Coerce an arbitrary client payload into a typed `ClientStats`. Throws
 * `StatsValidationError` if any field is out of range or the wrong shape.
 */
export function parseClientStats(input: unknown): ClientStats {
  const obj = (input ?? {}) as Record<string, unknown>;
  return {
    xp: validCounter(obj.xp, "xp"),
    coins: validCounter(obj.coins, "coins"),
    pveWins: validCounter(obj.pveWins, "pveWins"),
    pveLosses: validCounter(obj.pveLosses, "pveLosses"),
    pvpWins: validCounter(obj.pvpWins, "pvpWins"),
    pvpLosses: validCounter(obj.pvpLosses, "pvpLosses"),
    longestWinStreak: validCounter(obj.longestWinStreak, "longestWinStreak"),
  };
}

/**
 * Merge `client` into the server's row using `GREATEST(server, client)` for
 * every counter. Atomic: emitted as a single SQL statement so we never see a
 * partially-applied update under contention.
 */
export async function mergeStats(
  rawWallet: string,
  client: ClientStats,
): Promise<ServerStats> {
  const wallet = normaliseWallet(rawWallet);
  // Make sure the user (and an empty stats row) exist before the UPDATE.
  await getOrCreateUser(wallet);

  const rows = await query<StatsRow>(
    `UPDATE stats SET
        xp                  = GREATEST(xp,                  $2),
        coins               = GREATEST(coins,               $3),
        pve_wins            = GREATEST(pve_wins,            $4),
        pve_losses          = GREATEST(pve_losses,          $5),
        pvp_wins            = GREATEST(pvp_wins,            $6),
        pvp_losses          = GREATEST(pvp_losses,          $7),
        longest_win_streak  = GREATEST(longest_win_streak,  $8),
        updated_at          = now()
      WHERE wallet = $1
      RETURNING *`,
    [
      wallet,
      client.xp,
      client.coins,
      client.pveWins,
      client.pveLosses,
      client.pvpWins,
      client.pvpLosses,
      client.longestWinStreak,
    ],
  );
  if (!rows[0]) {
    throw new Error(`stats row missing for ${wallet} after upsert`);
  }
  return rowToServerStats(rows[0]);
}
