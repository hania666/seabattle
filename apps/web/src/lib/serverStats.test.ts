import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncStatsAfterSignIn, type ServerStatsPayload } from "./serverStats";
import { saveStats, loadStats } from "./stats";
import { saveCoins, loadCoins } from "./coins";
import type { AuthedFetch } from "./useAuth";

const wallet = "0x" + "a".repeat(40);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function makeFetch(handler: (init: RequestInit) => Response): AuthedFetch {
  return async (_input, init = {}) => handler(init);
}

const SERVER_RESPONSE: ServerStatsPayload = {
  wallet,
  xp: 500,
  coins: 80,
  pveWins: 4,
  pveLosses: 1,
  pvpWins: 0,
  pvpLosses: 0,
  longestWinStreak: 3,
  currentWinStreak: 1,
  lastMatchAt: null,
  updatedAt: Date.now(),
};

describe("syncStatsAfterSignIn", () => {
  it("posts the local snapshot and writes the merged response back", async () => {
    saveStats(
      {
        xp: 100,
        pveWins: 1,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0,
        matches: [
          {
            id: "m1",
            mode: "pve",
            won: true,
            xpGained: 100,
            playedAt: 123,
          },
        ],
      },
      wallet,
    );
    saveCoins(20, wallet);
    let captured: unknown = null;
    const fetch = makeFetch((init) => {
      captured = init.body;
      return new Response(JSON.stringify({ stats: SERVER_RESPONSE }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const out = await syncStatsAfterSignIn(wallet, fetch);
    expect(out).toEqual(SERVER_RESPONSE);

    expect(JSON.parse(captured as string)).toMatchObject({
      xp: 100,
      coins: 20,
      pveWins: 1,
    });

    const stats = loadStats(wallet);
    // Server values win because they're larger.
    expect(stats.xp).toBe(500);
    expect(stats.pveWins).toBe(4);
    // Local match history survives the merge.
    expect(stats.matches).toHaveLength(1);
    expect(loadCoins(wallet)).toBe(80);
  });

  it("keeps the local value when it's larger than the server", async () => {
    saveStats(
      {
        xp: 9999,
        pveWins: 50,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0,
        matches: [],
      },
      wallet,
    );
    saveCoins(9999, wallet);
    const fetch = makeFetch(
      () =>
        new Response(JSON.stringify({ stats: SERVER_RESPONSE }), { status: 200 }),
    );
    await syncStatsAfterSignIn(wallet, fetch);
    expect(loadStats(wallet).xp).toBe(9999);
    expect(loadCoins(wallet)).toBe(9999);
  });

  it("returns null on non-2xx responses without touching local state", async () => {
    saveStats(
      {
        xp: 50,
        pveWins: 0,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0,
        matches: [],
      },
      wallet,
    );
    const fetch = makeFetch(() => new Response("nope", { status: 401 }));
    const out = await syncStatsAfterSignIn(wallet, fetch);
    expect(out).toBeNull();
    expect(loadStats(wallet).xp).toBe(50);
  });

  it("returns null when fetch throws", async () => {
    const fetch: AuthedFetch = async () => {
      throw new Error("network down");
    };
    const out = await syncStatsAfterSignIn(wallet, fetch);
    expect(out).toBeNull();
  });
});
