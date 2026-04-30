import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import { privateKeyToAccount } from "viem/accounts";
import { wouldExceedPairCap, recordPair, Matchmaker } from "../matchmaking";
import { registerSocketHandlers } from "../socket";
import type { Env } from "../env";

const TEST_KEY = "0x".padEnd(66, "1") as `0x${string}`;

function validFleet() {
  return [
    { kind: "carrier"    as const, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] as [number,number][] },
    { kind: "battleship" as const, cells: [[2,0],[2,1],[2,2],[2,3]]       as [number,number][] },
    { kind: "cruiser"    as const, cells: [[4,0],[4,1],[4,2]]             as [number,number][] },
    { kind: "submarine"  as const, cells: [[6,0],[6,1],[6,2]]             as [number,number][] },
    { kind: "destroyer"  as const, cells: [[8,0],[8,1]]                   as [number,number][] },
  ];
}

interface Harness { url: string; close: () => Promise<void>; }

async function startHarness(): Promise<Harness> {
  const server = http.createServer();
  const io = new SocketIOServer(server, { cors: { origin: "*" } });
  const env: Env = {
    port: 0,
    corsOrigin: "*",
    chainId: 11124,
    lobbyAddress: "0x1111111111111111111111111111111111111111",
    botMatchAddress: null,
    signer: privateKeyToAccount(TEST_KEY),
  };
  registerSocketHandlers(io, env, null);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => { io.close(); server.close(() => r()); }),
  };
}

function connect(url: string): Promise<Socket> {
  const s = Client(url, { transports: ["websocket"], forceNew: true });
  return new Promise((res, rej) => {
    s.once("connect", () => res(s));
    s.once("connect_error", rej);
  });
}

function once<T>(s: Socket, event: string): Promise<T> {
  return new Promise((res) => s.once(event, res as (v: T) => void));
}

// Fresh addresses per call so anti-collusion cap never triggers in integration tests
let _seed = 0xb000;
function freshAddr(): `0x${string}` {
  return `0x${(++_seed).toString(16).padStart(40, "0")}` as `0x${string}`;
}

async function pairAndStart(url: string) {
  const A_ADDR = freshAddr();
  const B_ADDR = freshAddr();
  const s1 = await connect(url);
  const s2 = await connect(url);

  const ready1 = once<{ matchId: `0x${string}`; you: "A" | "B" }>(s1, "match:ready");
  const ready2 = once<{ matchId: `0x${string}`; you: "A" | "B" }>(s2, "match:ready");
  s1.emit("queue:join", { address: A_ADDR, stake: "100" });
  s2.emit("queue:join", { address: B_ADDR, stake: "100" });
  const [r1, r2] = await Promise.all([ready1, ready2]);

  const matchId = r1.matchId;
  const sA = r1.you === "A" ? s1 : s2;
  const sB = r1.you === "A" ? s2 : s1;

  const start = once<{ firstTurn: `0x${string}` }>(sA, "match:start");
  sA.emit("match:placeFleet", { matchId, fleet: validFleet() });
  sB.emit("match:placeFleet", { matchId, fleet: validFleet() });
  const { firstTurn } = await start;

  const firstSocket  = firstTurn === A_ADDR ? sA : sB;
  const secondSocket = firstTurn === A_ADDR ? sB : sA;

  return { s1, s2, sA, sB, matchId, firstSocket, secondSocket };
}

// ── Anti-collusion ────────────────────────────────────────────────────────────

describe("anti-collusion pair cap", () => {
  it("allows up to 10 matches then blocks the 11th", () => {
    const X = "0x1111111111111111111111111111111111111111";
    const Y = "0x2222222222222222222222222222222222222222";
    for (let i = 0; i < 10; i++) {
      expect(wouldExceedPairCap(X, Y)).toBe(false);
      recordPair(X, Y);
    }
    expect(wouldExceedPairCap(X, Y)).toBe(true);
  });

  it("pair key is symmetric — (A,B) same as (B,A)", () => {
    const X = "0x3333333333333333333333333333333333333333";
    const Y = "0x4444444444444444444444444444444444444444";
    for (let i = 0; i < 10; i++) recordPair(X, Y);
    expect(wouldExceedPairCap(Y, X)).toBe(true);
  });

  it("matchmaker skips capped pair and waits for a valid opponent", () => {
    const mm = new Matchmaker();
    const X = "0x5555555555555555555555555555555555555555" as const;
    const Y = "0x6666666666666666666666666666666666666666" as const;
    const Z = "0x7777777777777777777777777777777777777777" as const;

    for (let i = 0; i < 10; i++) recordPair(X, Y);

    mm.enqueue({ socketId: "s1", address: X, stake: 100n });
    expect(mm.enqueue({ socketId: "s2", address: Y, stake: 100n })).toBeNull();
    const pair = mm.enqueue({ socketId: "s3", address: Z, stake: 100n });
    expect(pair).not.toBeNull();
    expect(pair!.playerA.address).toBe(X);
    expect(pair!.playerB.address).toBe(Z);
  });
});

// ── Queue drain ───────────────────────────────────────────────────────────────

describe("queue drain", () => {
  it("drainStale removes entries older than maxWaitMs", () => {
    const mm = new Matchmaker();
    const OLD  = "0x8888888888888888888888888888888888888888" as const;
    const NEW_ = "0x9999999999999999999999999999999999999999" as const;
    mm.enqueue({ socketId: "old1", address: OLD,  stake: 100n, enqueuedAt: Date.now() - 10_000 });
    mm.enqueue({ socketId: "new1", address: NEW_, stake: 200n });

    const stale = mm.drainStale(5_000);
    expect(stale.map((e) => e.socketId)).toContain("old1");
    expect(stale.map((e) => e.socketId)).not.toContain("new1");
    expect(mm.size(100n)).toBe(0);
    expect(mm.size(200n)).toBe(1);
  });

  it("returns empty when nothing is stale", () => {
    const mm = new Matchmaker();
    const ADDR = "0xaaaabbbbaaaabbbbaaaabbbbaaaabbbbaaaabbbb" as const;
    mm.enqueue({ socketId: "s1", address: ADDR, stake: 100n });
    expect(mm.drainStale(60_000)).toHaveLength(0);
  });
});

// ── Socket security integration ───────────────────────────────────────────────

describe("socket security integration", () => {
  let harness: Harness;
  beforeEach(async () => { harness = await startHarness(); });
  afterEach(async () => { await harness.close(); });

  it("rejects second fire within 200ms (fire rate limit)", async () => {
    const { s1, s2, matchId, firstSocket } = await pairAndStart(harness.url);
    try {
      const err = once<{ message: string }>(firstSocket, "error");
      firstSocket.emit("match:fire", { matchId, row: 0, col: 0 });
      firstSocket.emit("match:fire", { matchId, row: 0, col: 1 });
      const payload = await err;
      expect(payload.message).toMatch(/firing too fast/i);
    } finally {
      s1.disconnect();
      s2.disconnect();
    }
  }, 10_000);

  it("signs win for opponent when player disconnects mid-game", async () => {
    const { s1, s2, firstSocket, secondSocket, matchId } = await pairAndStart(harness.url);
    try {
      const end = once<{ reason: string; signature: string | null }>(firstSocket, "match:end");
      secondSocket.disconnect();
      const result = await end;
      expect(result.reason).toBe("disconnect");
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    } finally {
      s1.disconnect();
    }
  }, 10_000);
});
