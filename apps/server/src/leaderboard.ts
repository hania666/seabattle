import fs from "node:fs/promises";
import path from "node:path";
import { verifyMessage, type Hex } from "viem";

/**
 * Very small file-backed leaderboard — one JSON file, keyed by lowercase wallet.
 * Entries are overwritten when a higher XP total is submitted. Submissions are
 * signed EIP-191 messages so a rogue client can't forge another player's XP.
 *
 * In Phase 7 we'll migrate this to the on-chain BotMatch ledger; for now it's
 * a transparent cache the web client can read and write.
 */

export interface LeaderboardEntry {
  address: `0x${string}`;
  xp: number;
  wins: number;
  losses: number;
  rankKey: string;
  updatedAt: number;
}

export interface LeaderboardStore {
  load(): Promise<LeaderboardEntry[]>;
  submit(entry: SubmitInput): Promise<LeaderboardEntry>;
}

interface SubmitInput {
  address: `0x${string}`;
  xp: number;
  wins: number;
  losses: number;
  rankKey: string;
  nonce: number;
  signature: Hex;
}

const SIGNING_DOMAIN = "sea3battle-leaderboard-v1";

export function buildSubmitMessage(input: Omit<SubmitInput, "signature">): string {
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

export function createFileStore(filePath: string): LeaderboardStore {
  // Serialize writes — the leaderboard is tiny and rarely-written, so a queue
  // is the simplest way to avoid the classic read-modify-write race.
  let queue: Promise<unknown> = Promise.resolve();

  async function readAll(): Promise<LeaderboardEntry[]> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as LeaderboardEntry[];
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  async function writeAll(entries: LeaderboardEntry[]): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(entries, null, 2), "utf8");
  }

  return {
    async load() {
      return readAll();
    },
    async submit(input) {
      const message = buildSubmitMessage({
        address: input.address,
        xp: input.xp,
        wins: input.wins,
        losses: input.losses,
        rankKey: input.rankKey,
        nonce: input.nonce,
      });
      const valid = await verifyMessage({
        address: input.address,
        message,
        signature: input.signature,
      });
      if (!valid) throw new Error("invalid signature");
      if (input.xp < 0 || input.xp > 10_000_000) throw new Error("xp out of range");
      if (input.wins < 0 || input.losses < 0) throw new Error("negative counters");

      const enqueued = queue.then(async () => {
        const all = await readAll();
        const idx = all.findIndex(
          (e) => e.address.toLowerCase() === input.address.toLowerCase(),
        );
        const prev = idx === -1 ? null : all[idx];
        // Only accept an update that strictly improves XP OR adds matches. This
        // keeps the board monotone without needing server auth.
        if (prev && input.xp < prev.xp) {
          return prev;
        }
        const entry: LeaderboardEntry = {
          address: input.address,
          xp: input.xp,
          wins: input.wins,
          losses: input.losses,
          rankKey: input.rankKey,
          updatedAt: Date.now(),
        };
        if (idx === -1) all.push(entry);
        else all[idx] = entry;
        await writeAll(all);
        return entry;
      });
      queue = enqueued.catch(() => undefined);
      return enqueued;
    },
  };
}

export function topN(entries: LeaderboardEntry[], n: number): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.xp - a.xp).slice(0, n);
}
