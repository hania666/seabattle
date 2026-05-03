import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Matchmaker,
  PAIR_WINDOW_MS,
  MAX_PAIRS_PER_WINDOW,
  type PairCapStore,
  dbPairCapStore,
  inMemoryPairCapStore,
  pairKey,
} from "../matchmaking";

const X = "0x1111111111111111111111111111111111111111" as const;
const Y = "0x2222222222222222222222222222222222222222" as const;
const Z = "0x3333333333333333333333333333333333333333" as const;

describe("inMemoryPairCapStore — semantics", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts only pairings inside the rolling window", async () => {
    const store = inMemoryPairCapStore();
    // 10 pairings 'now' → at the cap.
    for (let i = 0; i < MAX_PAIRS_PER_WINDOW; i++) await store.recordPair(X, Y);
    expect(await store.wouldExceedCap(X, Y)).toBe(true);

    // Fast-forward beyond the 24h window — the old rows should be ignored.
    vi.setSystemTime(Date.now() + PAIR_WINDOW_MS + 1000);
    expect(await store.wouldExceedCap(X, Y)).toBe(false);
  });

  it("getCappedPeers returns peers strictly at-or-above cap, lowercased", async () => {
    const store = inMemoryPairCapStore();
    for (let i = 0; i < MAX_PAIRS_PER_WINDOW; i++) await store.recordPair(X, Y);
    // Below cap — should NOT appear.
    await store.recordPair(X, Z);

    const blocked = await store.getCappedPeers(X);
    expect(blocked).toEqual(new Set([Y.toLowerCase()]));
    // Symmetry: Y looking up its blocked peers also sees X.
    const blockedFromY = await store.getCappedPeers(Y);
    expect(blockedFromY).toEqual(new Set([X.toLowerCase()]));
  });

  it("pair key is case-insensitive — (a,B) and (A,b) collapse onto one row", async () => {
    const store = inMemoryPairCapStore();
    for (let i = 0; i < MAX_PAIRS_PER_WINDOW; i++) {
      await store.recordPair(X, Y.toUpperCase());
    }
    // Different case must still hit the cap.
    expect(await store.wouldExceedCap(X.toUpperCase(), Y)).toBe(true);
  });
});

describe("pairKey", () => {
  it("is symmetric and lowercased", () => {
    expect(pairKey("0xAA", "0xbb")).toBe(pairKey("0xBB", "0xaa"));
    expect(pairKey("0xAA", "0xbb")).toMatch(/^0x[0-9a-f]+:0x[0-9a-f]+$/);
  });
});

describe("dbPairCapStore — query shape", () => {
  it("recordPair issues a single INSERT INTO pair_history with the canonical key", async () => {
    const queryMock = vi.fn().mockResolvedValue([]);
    const store = dbPairCapStore({ query: queryMock });

    await store.recordPair(X.toUpperCase(), Y);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO pair_history/);
    expect(params).toEqual([pairKey(X, Y)]);
  });

  it("wouldExceedCap returns true once the count meets the cap", async () => {
    const queryMock = vi.fn().mockResolvedValue([{ cnt: String(MAX_PAIRS_PER_WINDOW) }]);
    const store = dbPairCapStore({ query: queryMock });

    expect(await store.wouldExceedCap(X, Y)).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/COUNT\(\*\)/);
    expect(sql).toMatch(/pair_history/);
    expect(params[0]).toBe(pairKey(X, Y));
    // sinceIso = now - 24h, ISO timestamp shape
    expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("wouldExceedCap stays false when count is below cap (off-by-one guard)", async () => {
    const queryMock = vi.fn().mockResolvedValue([{ cnt: String(MAX_PAIRS_PER_WINDOW - 1) }]);
    const store = dbPairCapStore({ query: queryMock });
    expect(await store.wouldExceedCap(X, Y)).toBe(false);
  });

  it("wouldExceedCap treats missing row (no pairings yet) as 0", async () => {
    const queryMock = vi.fn().mockResolvedValue([]);
    const store = dbPairCapStore({ query: queryMock });
    expect(await store.wouldExceedCap(X, Y)).toBe(false);
  });

  it("getCappedPeers returns the peer column verbatim", async () => {
    const queryMock = vi.fn().mockResolvedValue([
      { peer: Y.toLowerCase() },
      { peer: Z.toLowerCase() },
    ]);
    const store = dbPairCapStore({ query: queryMock });

    const blocked = await store.getCappedPeers(X.toUpperCase());

    expect(blocked).toEqual(new Set([Y.toLowerCase(), Z.toLowerCase()]));
    const [sql, params] = queryMock.mock.calls[0];
    // The query MUST aggregate by peer and HAVING COUNT >= cap, otherwise
    // we'd get false positives from below-cap pairs.
    expect(sql).toMatch(/GROUP BY peer/);
    expect(sql).toMatch(/HAVING COUNT\(\*\) >=/);
    expect(params[0]).toBe(X.toLowerCase()); // lowercased before query
    expect(params[2]).toBe(MAX_PAIRS_PER_WINDOW);
  });
});

// Most important behaviour: the *whole reason* this module moved off an
// in-memory Map was so the cap survives across Matchmaker instances. A
// fresh Matchmaker that hits the same backing store must still see the
// existing pairings.
describe("pair cap persists across Matchmaker instances", () => {
  it("a second Matchmaker sharing the same store sees prior pairings", async () => {
    const store = inMemoryPairCapStore();
    for (let i = 0; i < MAX_PAIRS_PER_WINDOW; i++) await store.recordPair(X, Y);

    // Simulate a deploy / process restart by handing a fresh Matchmaker
    // the same persistent store.
    const restartedMm = new Matchmaker(store);

    await restartedMm.enqueue({ socketId: "s1", address: X, stake: 100n });
    // Pairing X+Y must still be blocked.
    expect(
      await restartedMm.enqueue({ socketId: "s2", address: Y, stake: 100n }),
    ).toBeNull();
    // …but X+Z is fine — pair cap is per-pair, not per-address.
    const ok = await restartedMm.enqueue({
      socketId: "s3",
      address: Z,
      stake: 100n,
    });
    expect(ok).not.toBeNull();
    expect(ok!.playerA.address).toBe(X);
    expect(ok!.playerB.address).toBe(Z);
  });
});

// ── Async correctness regressions ─────────────────────────────────────────────
// The DB-backed store yields the event loop on `await`. These tests pin the
// invariants that the in-memory `Matchmaker` must hold across that yield.
// Keeping them in unit-land (no real socket.io) so we can deterministically
// interleave the two paths via a hand-rolled gated store.

interface GatedStore {
  store: PairCapStore;
  /** Resolve the n-th in-flight `getCappedPeers` call (0-indexed). */
  release(n: number): void;
  /** Number of `getCappedPeers` calls currently blocked. */
  pendingCount(): number;
}

function gatedStore(): GatedStore {
  const inner = inMemoryPairCapStore();
  const gates: Array<() => void> = [];
  const pending: number[] = []; // indexes of unresolved gates
  return {
    store: {
      async wouldExceedCap(a: string, b: string) {
        return inner.wouldExceedCap(a, b);
      },
      async getCappedPeers(addr: string) {
        const idx = gates.length;
        pending.push(idx);
        await new Promise<void>((resolve) => {
          gates[idx] = () => {
            pending.splice(pending.indexOf(idx), 1);
            resolve();
          };
        });
        return inner.getCappedPeers(addr);
      },
      async recordPair(a: string, b: string) {
        return inner.recordPair(a, b);
      },
    },
    release(n) {
      const fn = gates[n];
      if (!fn) throw new Error(`no pending getCappedPeers call #${n}`);
      fn();
    },
    pendingCount() {
      return pending.length;
    },
  };
}

/** Wait for all microtasks queued so far to drain. */
async function flushMicrotasks(): Promise<void> {
  // Two passes: each await yields once, and the first one lets a new
  // microtask requeue itself if needed.
  await Promise.resolve();
  await Promise.resolve();
}

describe("Matchmaker concurrency (race regressions)", () => {
  it("two concurrent enqueues for an empty stake bucket pair correctly (no lost entry)", async () => {
    const gated = gatedStore();
    const mm = new Matchmaker(gated.store);

    // Both calls launch and immediately block on `getCappedPeers`. Before
    // the fix, each evaluated `?? []` to a *separate* fresh array, so when
    // the second one resumed it would `set(stakeKey, [B])`, overwriting
    // `set(stakeKey, [A])` from the first — A would vanish from the queue.
    const pA = mm.enqueue({ socketId: "sA", address: X, stake: 100n });
    const pB = mm.enqueue({ socketId: "sB", address: Y, stake: 100n });

    await flushMicrotasks();
    expect(gated.pendingCount()).toBe(2);

    // Resume A first, then B.
    gated.release(0);
    expect(await pA).toBeNull(); // A waits, queue = [A]

    gated.release(1);
    const result = await pB; // B sees A in the same array, pairs.

    expect(result).not.toBeNull();
    expect(result!.playerA.address).toBe(X);
    expect(result!.playerB.address).toBe(Y);
    // After pairing, the queue must be empty — neither A nor B left behind.
    expect(mm.size(100n)).toBe(0);
  });

  it("two concurrent enqueues that both find no opponent both end up in the queue", async () => {
    const gated = gatedStore();
    const mm = new Matchmaker(gated.store);

    // Same address on two sockets — they cannot pair with each other (the
    // self-match guard), so both must remain in the queue. Pre-fix, the
    // second writer's `set` would clobber the first array and leave only
    // the second socket queued.
    const p1 = mm.enqueue({ socketId: "s1", address: X, stake: 100n });
    const p2 = mm.enqueue({ socketId: "s2", address: X, stake: 100n });

    await flushMicrotasks();
    gated.release(0);
    gated.release(1);
    expect(await p1).toBeNull();
    expect(await p2).toBeNull();

    expect(mm.size(100n)).toBe(2);
  });

  it("drainStale running while enqueue is awaiting does not orphan the entry", async () => {
    const gated = gatedStore();
    const mm = new Matchmaker(gated.store);

    // Step 1: seed the map with a stale entry so the queue array exists.
    const seedP = mm.enqueue({
      socketId: "stale1",
      address: Y,
      stake: 100n,
      enqueuedAt: Date.now() - 10_000,
    });
    await flushMicrotasks();
    gated.release(0);
    expect(await seedP).toBeNull();
    expect(mm.size(100n)).toBe(1);

    // Step 2: start a fresh enqueue; it grabs a reference to the same
    // array and parks on the await.
    const freshP = mm.enqueue({ socketId: "fresh", address: X, stake: 100n });
    await flushMicrotasks();
    expect(gated.pendingCount()).toBe(1);

    // Step 3: drainStale fires while `freshP` is parked. Pre-fix it
    // replaced the array reference (`this.queues.set(key, fresh)`),
    // leaving the in-flight enqueue holding the orphaned old array.
    const stale = mm.drainStale(5_000);
    expect(stale.map((e) => e.socketId)).toEqual(["stale1"]);

    // Step 4: resume the fresh enqueue.
    gated.release(1);
    expect(await freshP).toBeNull();

    // The fresh entry must be visible under the live array. Pre-fix this
    // would be 0 (fresh was pushed to the detached old array; the map
    // pointed at drainStale's filtered copy).
    expect(mm.size(100n)).toBe(1);
  });
});
