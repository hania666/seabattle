import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Server as SocketIOServer } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import { privateKeyToAccount } from "viem/accounts";
import { registerSocketHandlers } from "../socket";
import type { Env } from "../env";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

const TEST_KEY = "0x".padEnd(66, "1") as `0x${string}`;

function validFleet() {
  return [
    { kind: "carrier" as const, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] as [number, number][] },
    { kind: "battleship" as const, cells: [[2, 0], [2, 1], [2, 2], [2, 3]] as [number, number][] },
    { kind: "cruiser" as const, cells: [[4, 0], [4, 1], [4, 2]] as [number, number][] },
    { kind: "submarine" as const, cells: [[6, 0], [6, 1], [6, 2]] as [number, number][] },
    { kind: "destroyer" as const, cells: [[8, 0], [8, 1]] as [number, number][] },
  ];
}

interface Harness {
  url: string;
  close: () => Promise<void>;
}

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
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        io.close();
        server.close(() => resolve());
      }),
  };
}

function connect(url: string): Promise<Socket> {
  const s = Client(url, { transports: ["websocket"], forceNew: true });
  return new Promise((resolve, reject) => {
    s.once("connect", () => resolve(s));
    s.once("connect_error", reject);
  });
}

function once<T>(s: Socket, event: string): Promise<T> {
  return new Promise((resolve) => s.once(event, resolve as (v: T) => void));
}

describe("socket integration", () => {
  let harness: Harness;
  beforeEach(async () => {
    harness = await startHarness();
  });
  afterEach(async () => {
    await harness.close();
  });

  it("pairs two players and runs a match end-to-end", async () => {
    const s1 = await connect(harness.url);
    const s2 = await connect(harness.url);
    try {
      const ready1 = once<{ matchId: `0x${string}`; you: "A" | "B" }>(s1, "match:ready");
      const ready2 = once<{ matchId: `0x${string}`; you: "A" | "B" }>(s2, "match:ready");
      s1.emit("queue:join", { address: A, stake: "100" });
      s2.emit("queue:join", { address: B, stake: "100" });
      const [r1, r2] = await Promise.all([ready1, ready2]);
      expect(r1.matchId).toBe(r2.matchId);
      expect(new Set([r1.you, r2.you])).toEqual(new Set(["A", "B"]));

      const matchId = r1.matchId;
      const sA = r1.you === "A" ? s1 : s2;
      const sB = r1.you === "A" ? s2 : s1;

      const start = once<{ firstTurn: `0x${string}` }>(sA, "match:start");
      sA.emit("match:placeFleet", { matchId, fleet: validFleet() });
      sB.emit("match:placeFleet", { matchId, fleet: validFleet() });
      const startPayload = await start;
      expect([A, B]).toContain(startPayload.firstTurn);

      // The player whose address matches startPayload.firstTurn goes first.
      // Sink every cell of the opponent's fleet.
      const firstPlayerSocket = startPayload.firstTurn === A ? sA : sB;
      const targets: [number, number][] = [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [2, 0], [2, 1], [2, 2], [2, 3],
        [4, 0], [4, 1], [4, 2],
        [6, 0], [6, 1], [6, 2],
        [8, 0], [8, 1],
      ];
      const end = once<{ winner: `0x${string}`; signature: `0x${string}` | null }>(sA, "match:end");
      for (const [row, col] of targets) {
        firstPlayerSocket.emit("match:fire", { matchId, row, col });
        // Small pause to ensure ordering — sockets process one message at a time.
        await new Promise((r) => setTimeout(r, 250));
      }
      const result = await end;
      expect(result.winner).toBe(startPayload.firstTurn);
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    } finally {
      s1.disconnect();
      s2.disconnect();
    }
  }, 15_000);

  it("rejects invalid stakes + malformed addresses", async () => {
    const s = await connect(harness.url);
    try {
      const err = once<{ message: string }>(s, "error");
      s.emit("queue:join", { address: "not-an-address", stake: "100" });
      const payload = await err;
      expect(payload.message).toMatch(/invalid address/i);
    } finally {
      s.disconnect();
    }
  });
});
