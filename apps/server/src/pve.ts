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

const MATCH_ID_RE = /^0x[0-9a-fA-F]{64}$/;

export function parseChainMatchId(input: unknown): `0x${string}` {
  if (typeof input !== "string" || !MATCH_ID_RE.test(input)) {
    throw new PveError(400, "bad_match_id");
  }
  return input.toLowerCase() as `0x${string}`;
}

/**
 * Allocate a server-side seed for an on-chain match. The `chainMatchId` is
 * what `BotMatch.playBot()` returned — we don't generate it ourselves
 * because the contract's `recordResult(matchId, won, signature)` only
 * accepts a signature over the chain-issued id. The server's only
 * contribution to identity is the `seed`, which the client uses to
 * deterministically place the bot fleet (so we can re-derive it during
 * `finishPveMatch` and verify the user's hits cover it).
 *
 * Idempotent on the chainMatchId: if the row already exists for this
 * wallet we just return the existing seed (handles client-side retries).
 * If it exists for someone else, that's a 403.
 */
export async function startPveMatch(
  rawWallet: string,
  difficulty: Difficulty,
  chainMatchId: `0x${string}`,
): Promise<StartedMatch> {
  const wallet = normaliseWallet(rawWallet);
  const seed = randomBytes32Hex();
  // INSERT ... ON CONFLICT DO NOTHING + RETURNING gives us the new row only
  // when we actually inserted; on conflict we fall back to a SELECT to
  // recover the existing seed.
  type StartRow = {
    seed: string;
    host_wallet: string;
    status: string;
    difficulty: string;
  };
  const inserted = await query<StartRow>(
    `INSERT INTO matches (id, mode, difficulty, host_wallet, seed, status)
     VALUES ($1, 'pve', $2, $3, $4, 'in_progress')
     ON CONFLICT (id) DO NOTHING
     RETURNING seed, host_wallet, status, difficulty`,
    [chainMatchId, difficulty, wallet, seed],
  );
  const row =
    inserted[0] ??
    (
      await query<StartRow>(
        `SELECT seed, host_wallet, status, difficulty FROM matches WHERE id = $1`,
        [chainMatchId],
      )
    )[0];
  if (!row) {
    // Vanishingly unlikely (insert returned no row but select also empty);
    // surface as a 500 so the client can retry.
    throw new PveError(500, "start_race");
  }
  if (row.host_wallet !== wallet) {
    throw new PveError(403, "wallet_mismatch");
  }
  if (row.status !== "in_progress") {
    throw new PveError(409, "match_already_settled");
  }
  // Always return the *persisted* difficulty, not the caller's parameter —
  // a retry with a mismatched difficulty must reflect the original choice
  // so the client doesn't play under the wrong assumption.
  return {
    matchId: chainMatchId,
    seed: row.seed as `0x${string}`,
    difficulty: row.difficulty as Difficulty,
  };
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
 * Walk the move log step-by-step against the seeded bot fleet and the
 * user-submitted fleet, validating each shot AND the implied win/loss
 * outcome.
 *
 * Rules enforced:
 *   - Every user shot's `hit` flag must match whether the cell is on a
 *     bot ship. Mismatch ⇒ `phantom_hit` (claimed hit, no ship) or
 *     `missed_actual_ship` (claimed miss, but ship is there).
 *   - Same for bot shots against the user fleet ⇒ `bot_phantom_hit` /
 *     `bot_missed_actual_ship`. This catches logs that were forged
 *     wholesale (Phase 8.6 only checked user-side hits).
 *   - First side to sink all 17 enemy cells wins the match. Any move
 *     recorded after that point ⇒ `move_after_finish`.
 *   - The claimed `won` flag must match the replayed outcome:
 *       won=true  + bot won first  ⇒ `win_unverified`
 *       won=true  + neither won    ⇒ `win_unverified`
 *       won=false + user won first ⇒ `loss_unverified`
 *     `won=false` with a partial bot lead OR neither side fully sunk is
 *     allowed (the user gave up / disconnected — they paid the entry fee,
 *     they lose, no signature payout matters).
 */
export function replayMatch(
  log: MoveLogEntry[],
  botShips: PlacedShip[],
  userShips: PlacedShip[],
  claimedWon: boolean,
): void {
  const botCells = new Set<string>();
  for (const s of botShips) for (const [r, c] of s.cells) botCells.add(`${r},${c}`);
  const userCells = new Set<string>();
  for (const s of userShips) for (const [r, c] of s.cells) userCells.add(`${r},${c}`);

  const userHitsOnBot = new Set<string>();
  const botHitsOnUser = new Set<string>();
  let outcome: "user_won" | "bot_won" | "in_progress" = "in_progress";

  for (const m of log) {
    if (outcome !== "in_progress") {
      // Match was already decided on the previous move — anything after
      // that is a forged extension, regardless of which side recorded it.
      throw new PveError(400, "move_after_finish");
    }
    const key = `${m.coord[0]},${m.coord[1]}`;
    if (m.by === "user") {
      const isShip = botCells.has(key);
      if (m.hit && !isShip) throw new PveError(400, "phantom_hit");
      if (!m.hit && isShip) throw new PveError(400, "missed_actual_ship");
      if (m.hit) userHitsOnBot.add(key);
      if (userHitsOnBot.size === FLEET_TOTAL_CELLS) outcome = "user_won";
    } else {
      const isShip = userCells.has(key);
      if (m.hit && !isShip) throw new PveError(400, "bot_phantom_hit");
      if (!m.hit && isShip) throw new PveError(400, "bot_missed_actual_ship");
      if (m.hit) botHitsOnUser.add(key);
      if (botHitsOnUser.size === FLEET_TOTAL_CELLS) outcome = "bot_won";
    }
  }

  if (claimedWon && outcome !== "user_won") {
    throw new PveError(400, "win_unverified");
  }
  if (!claimedWon && outcome === "user_won") {
    throw new PveError(400, "loss_unverified");
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
  // Normalise via the same helper /api/pve/start uses, so case-insensitive
  // chain ids resolve to the same DB row regardless of which casing the
  // client happens to send.
  const matchId = parseChainMatchId(body.matchId);
  if (typeof body.won !== "boolean") {
    throw new PveError(400, "bad_won");
  }
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
      replayMatch(log, botShips, userShips, won);
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

    // Defensive seed: the auth flow already runs `getOrCreateUser`, but if a
    // user row was manually deleted or a stats row never got created, a bare
    // UPDATE would silently match zero rows — the match would commit as
    // finished without a stats bump. Belt-and-braces: ensure the rows exist
    // first (no-ops in the common case), then UPDATE.
    await client.query(
      `INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
      [wallet],
    );
    await client.query(
      `INSERT INTO stats (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
      [wallet],
    );

    const statsUpdate = await client.query(
      won
        ? `UPDATE stats SET
              pve_wins           = pve_wins + 1,
              current_win_streak = current_win_streak + 1,
              longest_win_streak = GREATEST(longest_win_streak, current_win_streak + 1),
              last_match_at      = now(),
              updated_at         = now()
            WHERE wallet = $1`
        : `UPDATE stats SET
              pve_losses         = pve_losses + 1,
              current_win_streak = 0,
              last_match_at      = now(),
              updated_at         = now()
            WHERE wallet = $1`,
      [wallet],
    );
    if (statsUpdate.rowCount !== 1) {
      // Should be impossible given the upsert above; if it ever happens we
      // want the whole tx rolled back rather than committing an inconsistent
      // match-without-stats state.
      throw new Error("stats row not updated after upsert");
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
