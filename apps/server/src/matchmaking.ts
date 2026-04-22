import { randomBytes } from "node:crypto";

export interface QueueEntry {
  socketId: string;
  address: `0x${string}`;
  stake: bigint;
  matchId?: `0x${string}`; // on-chain lobby id if the client already created one
}

export interface Pairing {
  matchId: `0x${string}`;
  stake: bigint;
  playerA: QueueEntry;
  playerB: QueueEntry;
}

/**
 * Simple FIFO matchmaking keyed by exact stake. First arrival for a stake
 * waits; second arrival pairs with them. If the first arrival provided an
 * on-chain `matchId`, that id is used — otherwise we mint a random one so the
 * pair has a stable handle (useful for tests / offline demo).
 */
export class Matchmaker {
  private queues = new Map<string, QueueEntry[]>();
  private bySocket = new Map<string, QueueEntry>();

  enqueue(entry: QueueEntry): Pairing | null {
    const key = entry.stake.toString();
    this.bySocket.set(entry.socketId, entry);
    const queue = this.queues.get(key) ?? [];

    // Don't pair a player with themselves.
    const opponentIdx = queue.findIndex((e) => e.address !== entry.address);
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

  /** Remove a socket from any queue it's in (e.g. on disconnect). */
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

  size(stake: bigint): number {
    return this.queues.get(stake.toString())?.length ?? 0;
  }
}

export function randomMatchId(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
}
