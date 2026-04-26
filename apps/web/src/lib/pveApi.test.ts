import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { finishPveMatch, PveApiError, startPveMatch } from "./pveApi";

const SEED = `0x${"a".repeat(64)}`;
const MATCH = `0x${"b".repeat(64)}`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("startPveMatch", () => {
  let fetcher: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetcher = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts difficulty as the wire name and returns parsed result", async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse(200, { matchId: MATCH, seed: SEED, difficulty: "hard" }),
    );
    const out = await startPveMatch(MATCH as `0x${string}`, 2, fetcher);
    expect(out).toEqual({ matchId: MATCH, seed: SEED, difficulty: 2 });
    expect(fetcher).toHaveBeenCalledOnce();
    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ matchId: MATCH, difficulty: "hard" });
  });

  it("translates difficulty enum to the wire name for all values", async () => {
    for (const [d, name] of [
      [0, "easy"],
      [1, "normal"],
      [2, "hard"],
    ] as const) {
      fetcher.mockResolvedValueOnce(
        jsonResponse(200, { matchId: MATCH, seed: SEED, difficulty: name }),
      );
      const out = await startPveMatch(MATCH as `0x${string}`, d, fetcher);
      expect(out.difficulty).toBe(d);
      const [, init] = fetcher.mock.calls.at(-1)!;
      expect(JSON.parse((init as RequestInit).body as string).difficulty).toBe(name);
    }
  });

  it("throws PveApiError with the server's error code on 4xx", async () => {
    fetcher.mockResolvedValueOnce(jsonResponse(403, { error: "wallet_mismatch" }));
    await expect(startPveMatch(MATCH as `0x${string}`, 1, fetcher)).rejects.toMatchObject({
      name: "PveApiError",
      status: 403,
      code: "wallet_mismatch",
    });
  });

  it("falls back to http_<status> when the server's body isn't JSON", async () => {
    fetcher.mockResolvedValueOnce(new Response("nope", { status: 503 }));
    await expect(startPveMatch(MATCH as `0x${string}`, 0, fetcher)).rejects.toMatchObject({
      status: 503,
      code: "http_503",
    });
  });

  it("wraps network failures as PveApiError(0, ...)", async () => {
    fetcher.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(startPveMatch(MATCH as `0x${string}`, 0, fetcher)).rejects.toMatchObject({
      status: 0,
      code: "Failed to fetch",
    });
  });
});

describe("finishPveMatch", () => {
  let fetcher: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetcher = vi.fn();
  });

  it("forwards body unchanged and parses signature back", async () => {
    const sig = `0x${"c".repeat(130)}`;
    fetcher.mockResolvedValueOnce(jsonResponse(200, { matchId: MATCH, won: true, signature: sig }));
    const userShips = [
      { size: 5, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] as [number, number][] },
      { size: 4, cells: [[2, 0], [2, 1], [2, 2], [2, 3]] as [number, number][] },
      { size: 3, cells: [[4, 0], [4, 1], [4, 2]] as [number, number][] },
      { size: 3, cells: [[6, 0], [6, 1], [6, 2]] as [number, number][] },
      { size: 2, cells: [[8, 0], [8, 1]] as [number, number][] },
    ];
    const moveLog = [
      { by: "user" as const, coord: [0, 0] as [number, number], hit: true },
      { by: "bot" as const, coord: [9, 9] as [number, number], hit: false },
    ];
    const out = await finishPveMatch(
      { matchId: MATCH as `0x${string}`, won: true, userShips, moveLog },
      fetcher,
    );
    expect(out).toEqual({ matchId: MATCH, won: true, signature: sig });
    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ matchId: MATCH, won: true, userShips, moveLog });
  });

  it("propagates anti-cheat error codes (phantom_hit, win_unverified, …)", async () => {
    for (const code of ["phantom_hit", "win_unverified", "missed_actual_ship", "match_not_found"]) {
      fetcher.mockResolvedValueOnce(jsonResponse(400, { error: code }));
      await expect(
        finishPveMatch(
          {
            matchId: MATCH as `0x${string}`,
            won: true,
            userShips: [],
            moveLog: [],
          },
          fetcher,
        ),
      ).rejects.toMatchObject({ name: "PveApiError", code });
    }
  });
});

describe("PveApiError", () => {
  it("exposes status and code", () => {
    const e = new PveApiError(409, "match_already_settled");
    expect(e.status).toBe(409);
    expect(e.code).toBe("match_already_settled");
    expect(e.name).toBe("PveApiError");
  });
});
