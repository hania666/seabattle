import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Matchmaker,
  PAIR_WINDOW_MS,
  MAX_PAIRS_PER_WINDOW,
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
