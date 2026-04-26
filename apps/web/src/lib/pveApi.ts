/**
 * Bridge between the PvE flow and the server's anti-cheat endpoints.
 *
 * - `startPveMatch(matchId, difficulty, fetcher)` — POST /api/pve/start.
 *   `matchId` is the bytes32 returned by `BotMatch.playBot()` on chain
 *   (parsed from the `BotMatchStarted` event in the tx receipt). Server
 *   responds with the seed used for deterministic bot-fleet placement.
 *
 * - `finishPveMatch(...)` — POST /api/pve/finish. Sends the user's fleet
 *   plus the per-shot move log so the server can replay the win claim.
 *   Returns the EIP-191 signature redeemable via
 *   `BotMatch.recordResult(matchId, won, signature)` on chain.
 *
 * Both helpers take an `AuthedFetch` (from `useAuth`) so the call goes out
 * with the wallet-scoped JWT. Errors propagate as `PveApiError` so the UI
 * can surface a stable error code (`win_unverified`, `phantom_hit`, …).
 */
import { SERVER_URL } from "./socket";
import type { AuthedFetch } from "./useAuth";
import type { Difficulty } from "./game/types";

export type Hex32 = `0x${string}`;

export interface MoveLogEntry {
  by: "user" | "bot";
  coord: [number, number];
  hit: boolean;
}

export interface PlacedShipWire {
  size: number;
  cells: [number, number][];
}

export interface StartedMatch {
  matchId: Hex32;
  seed: Hex32;
  difficulty: Difficulty;
}

export interface FinishedMatch {
  matchId: Hex32;
  won: boolean;
  signature: Hex32;
}

const DIFFICULTY_NAME: Record<Difficulty, "easy" | "normal" | "hard"> = {
  0: "easy",
  1: "normal",
  2: "hard",
};

const DIFFICULTY_FROM_NAME: Record<"easy" | "normal" | "hard", Difficulty> = {
  easy: 0,
  normal: 1,
  hard: 2,
};

export class PveApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`pve api ${status} ${code}`);
    this.name = "PveApiError";
  }
}

async function postJson<T>(
  path: string,
  body: unknown,
  authedFetch: AuthedFetch,
): Promise<T> {
  let res: Response;
  try {
    res = await authedFetch(`${SERVER_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Network failures are common (Cloudflare hiccup, server cold-start);
    // surface a stable error code rather than the raw fetch message.
    throw new PveApiError(0, e instanceof Error ? e.message : "network");
  }
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const json = (await res.json()) as { error?: unknown };
      if (typeof json?.error === "string") code = json.error;
    } catch {
      // Body wasn't JSON; keep the http_<status> fallback.
    }
    throw new PveApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export async function startPveMatch(
  matchId: Hex32,
  difficulty: Difficulty,
  authedFetch: AuthedFetch,
): Promise<StartedMatch> {
  const out = await postJson<{
    matchId: string;
    seed: string;
    difficulty: "easy" | "normal" | "hard";
  }>("/api/pve/start", { matchId, difficulty: DIFFICULTY_NAME[difficulty] }, authedFetch);
  return {
    matchId: out.matchId as Hex32,
    seed: out.seed as Hex32,
    difficulty: DIFFICULTY_FROM_NAME[out.difficulty],
  };
}

export async function finishPveMatch(
  args: {
    matchId: Hex32;
    won: boolean;
    userShips: PlacedShipWire[];
    moveLog: MoveLogEntry[];
  },
  authedFetch: AuthedFetch,
): Promise<FinishedMatch> {
  const out = await postJson<{
    matchId: string;
    won: boolean;
    signature: string;
  }>("/api/pve/finish", args, authedFetch);
  return {
    matchId: out.matchId as Hex32,
    won: out.won,
    signature: out.signature as Hex32,
  };
}
