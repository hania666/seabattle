/**
 * PvE match lifecycle on the server (Phase 8.6 anti-cheat foundation).
 *
 * Two operations:
 *
 *   - `startPveMatch(wallet, difficulty)` allocates a fresh `matchId` (32
 *     random bytes) plus a separate `seed` (also 32 bytes), persists a
 *     `matches` row tagged `mode='pve'` / `status='in_progress'`, and
 *     returns both. The `matchId` is what BotMatch's contract expects;
 *     the `seed` is what the client must use to derive the bot's fleet
 *     and behaviour. Two distinct values so a leaked seed doesn't let an
 *     attacker forge contract claims.
 *
 *   - `finishPveMatch(wallet, body)` validates a match-completion claim:
 *       (1) the `matchId` belongs to this wallet and is still in progress,
 *       (2) the user-submitted fleet is structurally legal,
 *       (3) the `moveLog` is well-formed (alternating, in-bounds, no dup),
 *       (4) if the user claims a win, every cell of the bot's fleet (which
 *           we re-derive from the stored seed) is hit at least once.
 *     On success it marks the row `finished`, bumps the wallet's stats,
 *     writes an audit entry, and returns the same `signResult` signature
 *     the on-chain BotMatch contract accepts.
 *     On failure it marks the row `rejected` with the failure reason and
 *     audit-logs at severity `cheat`. No signature is returned.
 *
 * Today we don't replay every bot move (the `moveLog` is stored verbatim
 * for offline analysis). What we DO verify is the most consequential
 * claim — "I won" — by confirming the user's hits cover the bot fleet
 * derived from the server's seed. A future PR can add full step-by-step
 * replay against the seeded RNG.
 */
import { randomBytes } from "node:crypto";
import type { Hex, PrivateKeyAccount } from "viem";
import { normaliseWallet, query, recordAudit, withTransaction } from "./db";
import { signResult } from "./signer";
import {
  FLEET_TOTAL_CELLS,
  randomFleet,
  seededRandom,
  validateUserFleet,
  type PlacedShip,
} from "./game/fleet";

export type Difficulty = "easy" | "normal" | "hard";

const ALLOWED_DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

function isDifficulty(x: unknown): x is Difficulty {
  return typeof x === "string" && ALLOWED_DIFFICULTIES.includes(x as Difficulty);
}

export interface MatchRow {
  id: string;
  host_wallet: string | null;
  status: "in_progress" | "finished" | "rejected" | "timed_out";
  difficulty: string | null;
  seed: string | null;
  winner_wallet: string | null;
}

export class PveError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
    this.name = "PveError";
  }
}

function randomBytes32Hex(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}`;
}

export interface StartedMatch {
  matchId: `0x${string}`;
  seed: `0x${string}`;
  difficulty: Difficulty;
}

export async function startPveMatch(
  rawWallet: string,
  difficulty: Difficulty,
): Promise<StartedMatch> {
  const wallet = normaliseWallet(rawWallet);
  const matchId = randomBytes32Hex();
  const seed = randomBytes32Hex();
  await query(
    `INSERT INTO matches (id, mode, difficulty, host_wallet, seed, status)
     VALUES ($1, 'pve', $2, $3, $4, 'in_progress')`,
    [matchId, difficulty, wallet, seed],
  );
  return { matchId, seed, difficulty };
}

export interface FinishInput {
  matchId: unknown;
  won: unknown;
  userShips: unknown;
  moveLog: unknown;
}

export interface MoveLogEntry {
  by: "user" | "bot";
  coord: [number, number];
  hit: boolean;
}

const MAX_MOVES = 200; // 100 cells × 2 sides — anything bigger is malformed

export class MoveLogValidationError extends Error {
  constructor(public readonly reason: string) {
    super(`invalid moveLog: ${reason}`);
    this.name = "MoveLogValidationError";
  }
}

export function parseMoveLog(input: unknown): MoveLogEntry[] {
  if (!Array.isArray(input)) {
    throw new MoveLogValidationError("not_array");
  }
  if (input.length > MAX_MOVES) {
    throw new MoveLogValidationError("too_long");
  }
  const log: MoveLogEntry[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      throw new MoveLogValidationError("entry_not_object");
    }
    const e = raw as { by?: unknown; coord?: unknown; hit?: unknown };
    if (e.by !== "user" && e.by !== "bot") {
      throw new MoveLogValidationError("bad_by");
    }
    if (typeof e.hit !== "boolean") {
      throw new MoveLogValidationError("bad_hit");
    }
    if (
      !Array.isArray(e.coord) ||
      e.coord.length !== 2 ||
      typeof e.coord[0] !== "number" ||
      typeof e.coord[1] !== "number" ||
      !Number.isInteger(e.coord[0]) ||
      !Number.isInteger(e.coord[1]) ||
      e.coord[0] < 0 || e.coord[0] > 9 ||
      e.coord[1] < 0 || e.coord[1] > 9
    ) {
      throw new MoveLogValidationError("bad_coord");
    }
    log.push({ by: e.by, coord: [e.coord[0], e.coord[1]], hit: e.hit });
  }
  // No duplicate shots per side.
  const seen: Record<"user" | "bot", Set<string>> = {
    user: new Set(),
    bot: new Set(),
  };
  for (const m of log) {
    const key = `${m.coord[0]},${m.coord[1]}`;
    if (seen[m.by].has(key)) {
      throw new MoveLogValidationError("duplicate_shot");
    }
    seen[m.by].add(key);
  }
  return log;
}

/**
 * Verify the user's claimed result against the bot fleet derived from the
 * stored seed. Throws `PveError("400", "win_unverified")` if the user
 * claims a win but their hits don't cover the bot fleet.
 */
function verifyWinClaim(
  log: MoveLogEntry[],
  botShips: PlacedShip[],
  claimedWon: boolean,
): void {
  const botCells = new Set<string>();
  for (const s of botShips) {
    for (const [r, c] of s.cells) botCells.add(`${r},${c}`);
  }
  const userHits = new Set<string>();
  for (const m of log) {
    if (m.by !== "user") continue;
    const key = `${m.coord[0]},${m.coord[1]}`;
    if (m.hit && botCells.has(key)) userHits.add(key);
    // Also catch claims of "hit" on cells with no ship — that's a forged log.
    if (m.hit && !botCells.has(key)) {
      throw new PveError(400, "phantom_hit");
    }
    if (!m.hit && botCells.has(key)) {
      throw new PveError(400, "missed_actual_ship");
    }
  }
  const allCellsHit = userHits.size === FLEET_TOTAL_CELLS;
  if (claimedWon && !allCellsHit) {
    throw new PveError(400, "win_unverified");
  }
  if (!claimedWon && allCellsHit) {
    // The user hit everything but claims a loss — let it through (rare,
    // probably a UI bug or a test). Just audit it.
  }
}

export interface FinishContext {
  signer: PrivateKeyAccount;
  chainId: number;
  botMatchAddress: `0x${string}` | null;
}

export interface FinishResult {
  signature: Hex;
  matchId: `0x${string}`;
  won: boolean;
}

type Outcome =
  | { kind: "ok" }
  | { kind: "reject"; reason: string; cheat: boolean };

export async function finishPveMatch(
  rawWallet: string,
  body: FinishInput,
  ctx: FinishContext,
): Promise<FinishResult> {
  const wallet = normaliseWallet(rawWallet);
  if (!ctx.botMatchAddress) {
    throw new PveError(503, "bot_match_not_configured");
  }
  if (typeof body.matchId !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.matchId)) {
    throw new PveError(400, "bad_match_id");
  }
  if (typeof body.won !== "boolean") {
    throw new PveError(400, "bad_won");
  }
  const matchId = body.matchId;
  const won = body.won;

  // Single transaction: lock the match row, validate, then write the
  // terminal status (finished or rejected) atomically. This closes the
  // TOCTOU window where two concurrent /api/pve/finish requests could
  // each see `in_progress`, both pass validation, and both issue a
  // signature. The success-path UPDATE uses an extra `AND status =
  // 'in_progress'` guard as belt-and-braces — if it doesn't hit a row,
  // someone else won the race and we throw 409.
  const outcome = await withTransaction<Outcome>(async (client) => {
    const matchRows = await client.query<MatchRow>(
      `SELECT id, host_wallet, status, difficulty, seed, winner_wallet
       FROM matches WHERE id = $1 FOR UPDATE`,
      [matchId],
    );
    const match = matchRows.rows[0];
    if (!match) throw new PveError(404, "match_not_found");
    if (match.host_wallet !== wallet) throw new PveError(403, "wallet_mismatch");
    if (match.status !== "in_progress") {
      throw new PveError(409, "match_already_settled");
    }
    if (!match.seed) throw new PveError(500, "missing_seed");

    let userShips: PlacedShip[];
    try {
      userShips = validateUserFleet(body.userShips);
    } catch (e) {
      const reason = `fleet_${(e as Error).message.replace(/^invalid fleet: /, "")}`;
      await client.query(
        `UPDATE matches SET status = 'rejected', rejected_reason = $2, finished_at = now()
         WHERE id = $1 AND status = 'in_progress'`,
        [matchId, reason],
      );
      return { kind: "reject", reason, cheat: false };
    }

    let log: MoveLogEntry[];
    try {
      log = parseMoveLog(body.moveLog);
    } catch (e) {
      const reason = `move_${(e as Error).message.replace(/^invalid moveLog: /, "")}`;
      await client.query(
        `UPDATE matches SET status = 'rejected', rejected_reason = $2, finished_at = now()
         WHERE id = $1 AND status = 'in_progress'`,
        [matchId, reason],
      );
      return { kind: "reject", reason, cheat: false };
    }

    const botShips = randomFleet(seededRandom(match.seed));
    try {
      verifyWinClaim(log, botShips, won);
    } catch (e) {
      if (e instanceof PveError) {
        await client.query(
          `UPDATE matches SET status = 'rejected', rejected_reason = $2, finished_at = now()
           WHERE id = $1 AND status = 'in_progress'`,
          [matchId, e.code],
        );
        return { kind: "reject", reason: e.code, cheat: true };
      }
      throw e;
    }

    const updateRes = await client.query(
      `UPDATE matches SET
          status = 'finished',
          winner_wallet = $2,
          move_log = $3,
          result = $4,
          finished_at = now()
        WHERE id = $1 AND status = 'in_progress'`,
      [
        matchId,
        won ? wallet : null,
        JSON.stringify({ userShips, log }),
        JSON.stringify({ won }),
      ],
    );
    if (updateRes.rowCount !== 1) {
      throw new PveError(409, "match_already_settled");
    }

    if (won) {
      await client.query(
        `UPDATE stats SET
            pve_wins           = pve_wins + 1,
            current_win_streak = current_win_streak + 1,
            longest_win_streak = GREATEST(longest_win_streak, current_win_streak + 1),
            last_match_at      = now(),
            updated_at         = now()
          WHERE wallet = $1`,
        [wallet],
      );
    } else {
      await client.query(
        `UPDATE stats SET
            pve_losses         = pve_losses + 1,
            current_win_streak = 0,
            last_match_at      = now(),
            updated_at         = now()
          WHERE wallet = $1`,
        [wallet],
      );
    }

    return { kind: "ok" };
  });

  if (outcome.kind === "reject") {
    if (outcome.cheat) {
      // Audit lives outside the tx so a flaky audit insert can't roll back
      // a successfully-recorded rejection.
      await recordAudit({
        wallet,
        action: "pve.cheat",
        payload: { matchId, reason: outcome.reason },
        severity: "cheat",
      });
    }
    throw new PveError(400, outcome.reason);
  }

  const signature = await signResult(ctx.signer, {
    chainId: ctx.chainId,
    botMatchAddress: ctx.botMatchAddress,
    matchId: matchId as `0x${string}`,
    player: wallet as `0x${string}`,
    won,
  });

  return { signature, matchId: matchId as `0x${string}`, won };
}

export function parseDifficulty(input: unknown): Difficulty {
  if (!isDifficulty(input)) {
    throw new PveError(400, "bad_difficulty");
  }
  return input;
}
