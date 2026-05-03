import { randomBytes } from "node:crypto";
import { isDbConfigured, query } from "./db";

export interface QueueEntry {
  socketId: string;
  address: `0x${string}`;
  stake: bigint;
  matchId?: `0x${string}`;
  enqueuedAt?: number;
}

export interface Pairing {
  matchId: `0x${string}`;
  stake: bigint;
  playerA: QueueEntry;
  playerB: QueueEntry;
}

// Anti-collusion: cap how many times the same two wallets can match per day.
export const PAIR_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_PAIRS_PER_WINDOW = 10;

/**
 * Build the canonical pair key — lowercased + sorted so (A,B) and (B,A)
 * collapse onto the same row.
 */
export function pairKey(a: string, b: string): string {
  const [lo, hi] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${lo}:${hi}`;
}

/**
 * Persistence for the daily pair cap. Two implementations:
 *
 *  - dbPairCapStore: backed by the `pair_history` table. Used in production
 *    so the cap survives deploys / machine restarts and stays correct if we
 *    ever scale to more than one Fly machine.
 *  - inMemoryPairCapStore: process-local fallback for local dev without a
 *    DB and for unit tests that want isolated state per case.
 */
export interface PairCapStore {
  /** True iff this exact pair has already hit the cap inside the window. */
  wouldExceedCap(a: string, b: string): Promise<boolean>;
  /**
   * For an incoming queuer `addr`, return the lowercased addresses of all
   * peers they would be capped against. Lets the matchmaker check N
   * potential opponents in one query instead of N round-trips.
   */
  getCappedPeers(addr: string): Promise<Set<string>>;
  /** Append one pairing event. Caller is the socket layer post-pairing. */
  recordPair(a: string, b: string): Promise<void>;
}

export function inMemoryPairCapStore(): PairCapStore {
  interface Bucket {
    timestamps: number[]; // ms epoch
  }
  const buckets = new Map<string, Bucket>();

  function freshTimestamps(key: string): number[] {
    const cutoff = Date.now() - PAIR_WINDOW_MS;
    const bucket = buckets.get(key);
    if (!bucket) return [];
    const fresh = bucket.timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) buckets.delete(key);
    else bucket.timestamps = fresh;
    return fresh;
  }

  return {
    async wouldExceedCap(a, b) {
      return freshTimestamps(pairKey(a, b)).length >= MAX_PAIRS_PER_WINDOW;
    },
    async getCappedPeers(addr) {
      const me = addr.toLowerCase();
      const cutoff = Date.now() - PAIR_WINDOW_MS;
      const blocked = new Set<string>();
      for (const [key, bucket] of buckets) {
        const [lo, hi] = key.split(":");
        if (lo !== me && hi !== me) continue;
        const fresh = bucket.timestamps.filter((t) => t > cutoff);
        if (fresh.length >= MAX_PAIRS_PER_WINDOW) {
          blocked.add(lo === me ? (hi as string) : (lo as string));
        }
      }
      return blocked;
    },
    async recordPair(a, b) {
      const key = pairKey(a, b);
      const now = Date.now();
      const bucket = buckets.get(key) ?? { timestamps: [] };
      bucket.timestamps.push(now);
      buckets.set(key, bucket);
    },
  };
}

interface DbDeps {
  query: typeof query;
}

/**
 * Postgres-backed pair history. Each pairing is one row in `pair_history`,
 * which is cheap to count and trivially serialisable across machines.
 */
export function dbPairCapStore(deps: DbDeps = { query }): PairCapStore {
  function sinceIso(): string {
    return new Date(Date.now() - PAIR_WINDOW_MS).toISOString();
  }

  return {
    async wouldExceedCap(a, b) {
      const rows = await deps.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM pair_history
          WHERE pair_key = $1 AND paired_at > $2`,
        [pairKey(a, b), sinceIso()],
      );
      const cnt = Number(rows[0]?.cnt ?? "0");
      return cnt >= MAX_PAIRS_PER_WINDOW;
    },
    async getCappedPeers(addr) {
      // For all pairs touching `addr` in the last 24h, return the *peer*
      // addresses whose pair count has already hit the cap.
      const me = addr.toLowerCase();
      const rows = await deps.query<{ peer: string }>(
        `SELECT
           CASE
             WHEN split_part(pair_key, ':', 1) = $1
               THEN split_part(pair_key, ':', 2)
             ELSE split_part(pair_key, ':', 1)
           END AS peer
         FROM pair_history
         WHERE (split_part(pair_key, ':', 1) = $1
             OR split_part(pair_key, ':', 2) = $1)
           AND paired_at > $2
         GROUP BY peer
         HAVING COUNT(*) >= $3`,
        [me, sinceIso(), MAX_PAIRS_PER_WINDOW],
      );
      return new Set(rows.map((r) => r.peer));
    },
    async recordPair(a, b) {
      await deps.query(
        `INSERT INTO pair_history (pair_key) VALUES ($1)`,
        [pairKey(a, b)],
      );
    },
  };
}

/** Default store used by `Matchmaker` when none is injected. */
export function defaultPairCapStore(): PairCapStore {
  return isDbConfigured() ? dbPairCapStore() : inMemoryPairCapStore();
}

export class Matchmaker {
  private queues = new Map<string, QueueEntry[]>();
  private bySocket = new Map<string, QueueEntry>();
  private store: PairCapStore;

  constructor(store?: PairCapStore) {
    this.store = store ?? defaultPairCapStore();
  }

  /**
   * Try to pair `entry` against an existing queuer at the same stake. The
   * cap check uses one DB round-trip (`getCappedPeers`) so this scales
   * even if the queue grows.
   */
  async enqueue(entry: QueueEntry): Promise<Pairing | null> {
    const stakeKey = entry.stake.toString();
    entry.enqueuedAt ??= Date.now();
    this.bySocket.set(entry.socketId, entry);

    // Install the queue array in the map BEFORE awaiting on the store.
    // The await yields the event loop, so concurrent enqueues for the
    // same stake would otherwise each evaluate `?? []` to a *separate*
    // fresh array, then race on `this.queues.set` after the await — the
    // later writer silently overwrites the earlier one, the earlier
    // entry stays in `bySocket` but never appears in any queue (ghost
    // socket: never matched, never drained). We instead make all
    // concurrent calls share one array reference and mutate it in place.
    let queue = this.queues.get(stakeKey);
    if (!queue) {
      queue = [];
      this.queues.set(stakeKey, queue);
    }

    const blockedPeers = await this.store.getCappedPeers(entry.address);
    const myAddrLower = entry.address.toLowerCase();

    const opponentIdx = queue.findIndex(
      (e) =>
        e.address !== entry.address &&
        !blockedPeers.has(e.address.toLowerCase()) &&
        e.address.toLowerCase() !== myAddrLower, // defense in depth
    );

    if (opponentIdx === -1) {
      queue.push(entry);
      return null;
    }

    const opponent = queue.splice(opponentIdx, 1)[0]!;
    this.bySocket.delete(entry.socketId);
    this.bySocket.delete(opponent.socketId);

    const matchId = opponent.matchId ?? entry.matchId ?? randomMatchId();
    return { matchId, stake: entry.stake, playerA: opponent, playerB: entry };
  }

  /** Persist a successful pairing for future cap evaluations. */
  recordPair(a: string, b: string): Promise<void> {
    return this.store.recordPair(a, b);
  }

  remove(socketId: string): void {
    const entry = this.bySocket.get(socketId);
    if (!entry) return;
    this.bySocket.delete(socketId);
    const stakeKey = entry.stake.toString();
    const queue = this.queues.get(stakeKey);
    if (!queue) return;
    const idx = queue.findIndex((e) => e.socketId === socketId);
    if (idx >= 0) queue.splice(idx, 1);
  }

  /** Returns all entries that have been waiting longer than maxWaitMs. */
  drainStale(maxWaitMs: number): QueueEntry[] {
    const now = Date.now();
    const stale: QueueEntry[] = [];
    // Mutate each queue in place rather than replacing the array reference.
    // `enqueue` may be holding a reference to this exact array across an
    // `await` (see comment in enqueue above) — replacing the map entry
    // would leave the awaiting enqueue writing to an orphaned array.
    for (const queue of this.queues.values()) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const e = queue[i]!;
        if (now - (e.enqueuedAt ?? now) > maxWaitMs) {
          stale.push(e);
          queue.splice(i, 1);
        }
      }
    }
    for (const e of stale) this.bySocket.delete(e.socketId);
    return stale;
  }

  size(stake: bigint): number {
    return this.queues.get(stake.toString())?.length ?? 0;
  }
}

export function randomMatchId(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
}
