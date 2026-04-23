import { SERVER_URL } from "./socket";

export interface LeaderboardEntry {
  address: `0x${string}`;
  xp: number;
  wins: number;
  losses: number;
  rankKey: string;
  updatedAt: number;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  total: number;
  updatedAt: number;
}

const SIGNING_DOMAIN = "sea3battle-leaderboard-v1";

export interface SubmitInput {
  address: `0x${string}`;
  xp: number;
  wins: number;
  losses: number;
  rankKey: string;
  nonce: number;
}

export function buildSubmitMessage(input: SubmitInput): string {
  return [
    SIGNING_DOMAIN,
    input.address.toLowerCase(),
    `xp=${input.xp}`,
    `wins=${input.wins}`,
    `losses=${input.losses}`,
    `rank=${input.rankKey}`,
    `nonce=${input.nonce}`,
  ].join("\n");
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardResponse | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/leaderboard?limit=${limit}`, {
      method: "GET",
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}

export async function submitLeaderboard(
  input: SubmitInput,
  signature: `0x${string}`,
): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/leaderboard/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, signature }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
