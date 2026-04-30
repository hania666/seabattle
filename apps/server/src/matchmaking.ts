import { randomBytes } from "node:crypto";

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
const PAIR_WINDOW_MS       = 24 * 60 * 60 * 1000;
const MAX_PAIRS_PER_WINDOW = 10;

interface PairRecord { count: number; windowStart: number; }
const pairHistory = new Map<string, PairRecord>();

function pairKey(a: string, b: string): string {
  const [lo, hi] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${lo}:${hi}`;
}

export function wouldExceedPairCap(a: string, b: string): boolean {
  const entry = pairHistory.get(pairKey(a, b));
  if (!entry || Date.now() - entry.windowStart > PAIR_WINDOW_MS) return false;
  return entry.count >= MAX_PAIRS_PER_WINDOW;
}

export function recordPair(a: string, b: string): void {
  const key = pairKey(a, b);
  const now = Date.now();
  const entry = pairHistory.get(key);
  if (!entry || now - entry.windowStart > PAIR_WINDOW_MS) {
    pairHistory.set(key, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
}

export class Matchmaker {
  private queues = new Map<string, QueueEntry[]>();
  private bySocket = new Map<string, QueueEntry>();

  enqueue(entry: QueueEntry): Pairing | null {
    const key = entry.stake.toString();
    entry.enqueuedAt ??= Date.now();
    this.bySocket.set(entry.socketId, entry);
    const queue = this.queues.get(key) ?? [];

    const opponentIdx = queue.findIndex(
      (e) => e.address !== entry.address && !wouldExceedPairCap(entry.address, e.address),
    );

    if (opponentIdx === -1) {
      queue.push(entry);
      this.queues.set(key, queue);
      return null;
    }

    const opponent = queue.splice(opponentIdx, 1)[0]!;
    this.queues.set(key, queue);
    this.bySocket.delete(entry.socketId);
    this.bySocket.delete(opponent.socketId);

    const matchId = opponent.matchId ?? entry.matchId ?? randomMatchId();
    return { matchId, stake: entry.stake, playerA: opponent, playerB: entry };
  }

  remove(socketId: string): void {
    const entry = this.bySocket.get(socketId);
    if (!entry) return;
    this.bySocket.delete(socketId);
    const key = entry.stake.toString();
    const queue = this.queues.get(key);
    if (!queue) return;
    const idx = queue.findIndex((e) => e.socketId === socketId);
    if (idx >= 0) queue.splice(idx, 1);
  }

  /** Returns all entries that have been waiting longer than maxWaitMs. */
  drainStale(maxWaitMs: number): QueueEntry[] {
    const now = Date.now();
    const stale: QueueEntry[] = [];
    for (const [key, queue] of this.queues) {
      const fresh = queue.filter((e) => {
        if (now - (e.enqueuedAt ?? now) > maxWaitMs) { stale.push(e); return false; }
        return true;
      });
      this.queues.set(key, fresh);
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
