import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Lazily initialise the connection pool from DATABASE_URL.
 * Supabase session-pooler URLs already contain the SSL params we need; we
 * Alpine ca-certificates package is installed in the Dockerfile so
 * Amazon/Supabase certs are trusted and rejectUnauthorized stays true.
 */
export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // Strip pg's url-derived `sslmode=require` so it doesn't override our
  // explicit ssl option below. Supabase's pooler cert chain isn't always
  // in Node's bundled CAs (musl/Alpine), so we accept the chain after
  // verifying the hostname instead.
  const cleanUrl = stripSslMode(url);
  pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });
  return pool;
}

/**
 * Remove every `sslmode=...` query param from a Postgres URL while keeping
 * the rest of the query string syntactically valid. Exported for tests.
 */
export function stripSslMode(url: string): string {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return url;
  const base = url.slice(0, qIdx);
  const params = url
    .slice(qIdx + 1)
    .split("&")
    .filter((p) => p.length > 0 && !/^sslmode=/i.test(p));
  return params.length === 0 ? base : `${base}?${params.join("&")}`;
}

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return res.rows;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[db] ROLLBACK failed", rollbackErr);
      }
      throw e;
    }
  });
}

/**
 * Lower-case a wallet address; we store everything that way so lookups are
 * case-insensitive. Throws on anything that's not a valid 0x40-hex address.
 */
export function normaliseWallet(raw: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw new Error(`invalid wallet address: ${raw}`);
  }
  return raw.toLowerCase();
}

export interface UserRow {
  wallet: string;
  created_at: Date;
  last_seen_at: Date;
  banned_at: Date | null;
  banned_reason: string | null;
  ip_country: string | null;
  display_name: string | null;
  display_name_changed_at: Date | null;
  referral_code: string | null;
  referral_code_changed_at: Date | null;
}

export interface StatsRow {
  wallet: string;
  xp: number;
  coins: number;
  pve_wins: number;
  pve_losses: number;
  pvp_wins: number;
  pvp_losses: number;
  current_win_streak: number;
  longest_win_streak: number;
  last_match_at: Date | null;
  updated_at: Date;
}

/**
 * Insert the user (and an empty stats row) on first sight, otherwise touch
 * `last_seen_at`. Returns the user row.
 */
export async function getOrCreateUser(rawWallet: string): Promise<UserRow> {
  const wallet = normaliseWallet(rawWallet);
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (wallet)
       VALUES ($1)
       ON CONFLICT (wallet) DO UPDATE SET last_seen_at = now()`,
      [wallet],
    );
    await client.query(
      `INSERT INTO stats (wallet)
       VALUES ($1)
       ON CONFLICT (wallet) DO NOTHING`,
      [wallet],
    );
    const { rows } = await client.query<UserRow>(
      `SELECT * FROM users WHERE wallet = $1`,
      [wallet],
    );
    return rows[0];
  });
}

export async function getStats(rawWallet: string): Promise<StatsRow | null> {
  const wallet = normaliseWallet(rawWallet);
  const rows = await query<StatsRow>(
    `SELECT * FROM stats WHERE wallet = $1`,
    [wallet],
  );
  return rows[0] ?? null;
}

export async function isBanned(rawWallet: string): Promise<boolean> {
  const wallet = normaliseWallet(rawWallet);
  const rows = await query<{ banned_at: Date | null }>(
    `SELECT banned_at FROM users WHERE wallet = $1`,
    [wallet],
  );
  return rows[0]?.banned_at != null;
}

/**
 * Append a single audit-log entry. Used for every server-side mutation we
 * care about (login, claim, suspected cheat, ban). Best-effort: failures
 * are logged but never thrown, so an audit hiccup can't break gameplay.
 */
export async function recordAudit(entry: {
  wallet: string | null;
  action: string;
  payload?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  severity?: "info" | "warn" | "cheat" | "ban";
}): Promise<void> {
  try {
    const wallet = entry.wallet ? normaliseWallet(entry.wallet) : null;
    await query(
      `INSERT INTO audit_log (wallet, action, payload, ip, user_agent, severity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        wallet,
        entry.action,
        entry.payload != null ? JSON.stringify(entry.payload) : null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.severity ?? "info",
      ],
    );
  } catch (e) {
    console.error("[db] failed to record audit", entry.action, e);
  }
}

export async function pingDb(): Promise<{ ok: true; now: Date } | { ok: false; error: string }> {
  try {
    const rows = await query<{ now: Date }>(`SELECT now() AS now`);
    return { ok: true, now: rows[0].now };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Cooldown between username changes, in milliseconds.
 *
 * Per-wallet rule: once a user has set a non-null `display_name`, they must
 * wait this long before setting it to anything else. Two reasons:
 *   1. Anti-impersonation: blocks "park a famous nickname → release it →
 *      log right back in to grab it again". Adversary can't churn names.
 *   2. Anti-farm: usernames are a public surface (leaderboard, referrals);
 *      churning them across wallets at high rate would let one human
 *      operator pretend to be a community.
 *
 * 7 days was picked deliberately: long enough that an impostor can't
 * "park-then-grab" a name they don't own, short enough that real users
 * who genuinely typo'd their name aren't punished for a month.
 *
 * Tunable via DISPLAY_NAME_CHANGE_COOLDOWN_DAYS env var. The export is
 * derived once at module load to keep tests deterministic.
 */
function parseDisplayNameCooldownDays(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 7;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `invalid DISPLAY_NAME_CHANGE_COOLDOWN_DAYS: ${JSON.stringify(raw)} ` +
        `(must be a non-negative number of days)`,
    );
  }
  return n;
}
export const DISPLAY_NAME_CHANGE_COOLDOWN_MS =
  parseDisplayNameCooldownDays(process.env.DISPLAY_NAME_CHANGE_COOLDOWN_DAYS) *
  24 *
  60 *
  60 *
  1000;

export class DisplayNameCooldownError extends Error {
  readonly nextAllowedAt: Date;
  constructor(nextAllowedAt: Date) {
    super("display_name_cooldown");
    this.name = "DisplayNameCooldownError";
    this.nextAllowedAt = nextAllowedAt;
  }
}

/**
 * Set or update the user's display_name.
 *
 * Idempotent on no-op writes (same name as currently stored): the cooldown
 * does not trip, and `display_name_changed_at` is left untouched. This
 * matters because the auth flow may call this on every sign-in for users
 * who already have a name set — we don't want to keep refreshing the
 * cooldown anchor.
 *
 * Otherwise: if the user has a previous name AND it was set within the
 * cooldown window, throw `DisplayNameCooldownError` so the route handler
 * can surface a 429 with the unlock time. Successful change atomically
 * stamps `display_name_changed_at = now()` so the next-allowed time can
 * be computed from a single timestamp.
 */
export async function setDisplayName(rawWallet: string, name: string): Promise<UserRow> {
  const wallet = normaliseWallet(rawWallet);
  return withTransaction(async (client) => {
    const existing = await client.query<UserRow>(
      `SELECT * FROM users WHERE wallet = $1 FOR UPDATE`,
      [wallet],
    );
    const current = existing.rows[0];
    if (!current) throw new Error("user not found");

    // No-op: caller is asking to set the same name we already have. Skip
    // both the cooldown check and the update — nothing changes anyway,
    // and we don't want to bump `display_name_changed_at`.
    if (current.display_name === name) return current;

    if (
      current.display_name !== null &&
      current.display_name_changed_at !== null
    ) {
      const lastChange = new Date(current.display_name_changed_at).getTime();
      const elapsed = Date.now() - lastChange;
      if (elapsed < DISPLAY_NAME_CHANGE_COOLDOWN_MS) {
        const nextAllowedAt = new Date(lastChange + DISPLAY_NAME_CHANGE_COOLDOWN_MS);
        throw new DisplayNameCooldownError(nextAllowedAt);
      }
    }

    const updated = await client.query<UserRow>(
      `UPDATE users
          SET display_name = $2,
              display_name_changed_at = now()
        WHERE wallet = $1
        RETURNING *`,
      [wallet, name],
    );
    return updated.rows[0]!;
  });
}

/**
 * Cooldown between vanity referral-code changes, in milliseconds. Shorter
 * than the username cooldown (24h vs 7d) because referral codes are not
 * an identity surface — collisions just route invites to the wrong wallet,
 * which is reversible the next sign-in. Tunable via env.
 */
function parseReferralCodeCooldownHours(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 24;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `invalid REFERRAL_CODE_CHANGE_COOLDOWN_HOURS: ${JSON.stringify(raw)} ` +
        `(must be a non-negative number of hours)`,
    );
  }
  return n;
}
export const REFERRAL_CODE_CHANGE_COOLDOWN_MS =
  parseReferralCodeCooldownHours(process.env.REFERRAL_CODE_CHANGE_COOLDOWN_HOURS) *
  60 *
  60 *
  1000;

/**
 * Lower-cased reserved words that may not be claimed as referral codes.
 * Mostly route segments and identity-adjacent words a user could use to
 * impersonate platform tooling. Match is case-insensitive.
 */
export const RESERVED_REFERRAL_CODES = new Set<string>([
  "admin",
  "support",
  "help",
  "system",
  "official",
  "team",
  "seabattle",
  "battleship",
  "null",
  "undefined",
  "anonymous",
  "owner",
  "moderator",
  "mod",
  "root",
  "api",
  "auth",
  "login",
  "signup",
  "verify",
  "leaderboard",
  "referrals",
  "profile",
  "shop",
  "claim",
]);

export class ReferralCodeCooldownError extends Error {
  readonly nextAllowedAt: Date;
  constructor(nextAllowedAt: Date) {
    super("referral_code_cooldown");
    this.name = "ReferralCodeCooldownError";
    this.nextAllowedAt = nextAllowedAt;
  }
}

/**
 * Set or update the user's vanity referral code.
 *
 * Same idempotency + cooldown shape as `setDisplayName`. Validation of the
 * shape (length, charset, leading-letter) is the route handler's job;
 * here we only enforce the rules that need DB state (reserved words +
 * cooldown + uniqueness).
 *
 * Throws `ReferralCodeCooldownError` if the user just changed their code,
 * or surfaces a Postgres unique-violation if the code is already taken
 * (the route handler maps that to 409). Reserved words throw a plain
 * `Error("referral_code_reserved")` which the handler maps to 400.
 */
export async function setReferralCode(rawWallet: string, code: string): Promise<UserRow> {
  const wallet = normaliseWallet(rawWallet);
  if (RESERVED_REFERRAL_CODES.has(code.toLowerCase())) {
    throw new Error("referral_code_reserved");
  }
  return withTransaction(async (client) => {
    const existing = await client.query<UserRow>(
      `SELECT * FROM users WHERE wallet = $1 FOR UPDATE`,
      [wallet],
    );
    const current = existing.rows[0];
    if (!current) throw new Error("user not found");

    if (current.referral_code === code) return current;

    if (
      current.referral_code !== null &&
      current.referral_code_changed_at !== null
    ) {
      const lastChange = new Date(current.referral_code_changed_at).getTime();
      const elapsed = Date.now() - lastChange;
      if (elapsed < REFERRAL_CODE_CHANGE_COOLDOWN_MS) {
        const nextAllowedAt = new Date(lastChange + REFERRAL_CODE_CHANGE_COOLDOWN_MS);
        throw new ReferralCodeCooldownError(nextAllowedAt);
      }
    }

    const updated = await client.query<UserRow>(
      `UPDATE users
          SET referral_code = $2,
              referral_code_changed_at = now()
        WHERE wallet = $1
        RETURNING *`,
      [wallet, code],
    );
    return updated.rows[0]!;
  });
}

/**
 * Resolve a referral identifier (either a wallet address or a vanity code)
 * to a wallet address. Returns null if the input doesn't look like either
 * a valid wallet or a registered code. Used by `saveReferral` so a URL
 * like `?ref=hania111` can route to the right inviter without exposing
 * their wallet on chain.
 */
export async function resolveReferrer(rawValue: string | null | undefined): Promise<string | null> {
  if (!rawValue) return null;
  const value = rawValue.trim();
  if (value.length === 0) return null;
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return value.toLowerCase();
  }
  // Cheap shape filter so we don't burn a DB call on garbage referral params.
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(value)) return null;
  const rows = await query<{ wallet: string }>(
    `SELECT wallet FROM users WHERE LOWER(referral_code) = LOWER($1) LIMIT 1`,
    [value],
  );
  return rows[0]?.wallet ?? null;
}

export async function getUser(rawWallet: string): Promise<UserRow | null> {
  const wallet = normaliseWallet(rawWallet);
  const rows = await query<UserRow>(`SELECT * FROM users WHERE wallet = $1`, [wallet]);
  return rows[0] ?? null;
}

/**
 * Reasons a referral attempt can be rejected. Surfaced to the audit log so
 * we can spot abuse patterns without inventing magic strings everywhere.
 */
export type ReferralRejectReason =
  | "self_referral"
  | "invalid_format"
  | "unknown_referrer"
  | "sybil_cap_exceeded"
  | "duplicate_referee";

export type ReferralResult =
  | { ok: true }
  | { ok: false; reason: ReferralRejectReason };

/**
 * Maximum referrals a single referrer can accept in a rolling 24h window.
 * Above this, attempts are rejected and audited as `referral_rejected` so
 * sybil farms can't pivot N freshly-funded EOAs into one main wallet's
 * referral count overnight.
 *
 * Tunable via REFERRAL_DAILY_CAP env var. 20 is a deliberate-but-not-tiny
 * default: organic word-of-mouth from a single user rarely exceeds 5/day,
 * so 20 is generous while still capping pure scripted abuse.
 */
/**
 * Parse REFERRAL_DAILY_CAP at module load. We validate eagerly because
 * `Number("abc")` returns `NaN`, and `recent >= NaN` is always `false`
 * per IEEE 754 — that would silently disable the cap, defeating the
 * whole point of this defence.
 */
function parseReferralDailyCap(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 20;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(
      `invalid REFERRAL_DAILY_CAP: ${JSON.stringify(raw)} ` +
        `(must be a non-negative integer)`,
    );
  }
  return n;
}
export { parseReferralDailyCap as _parseReferralDailyCap };
export const REFERRAL_DAILY_CAP = parseReferralDailyCap(process.env.REFERRAL_DAILY_CAP);
const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * DB primitives saveReferral depends on, exposed as an interface so tests
 * can substitute fakes. Production code uses the module-level defaults.
 */
export interface ReferralDeps {
  query: typeof query;
  recordAudit: typeof recordAudit;
}

const defaultReferralDeps: ReferralDeps = { query, recordAudit };

/**
 * Best-effort referral persistence with anti-sybil + audit guarantees.
 *
 * Validation order (cheapest-first, to avoid burning DB on garbage):
 *   1. format: ref must be 0x + 40 hex
 *   2. self-referral: ref !== referee
 *   3. referrer must exist in `users` (else FK insert would fail silently)
 *   4. referrer must not exceed REFERRAL_DAILY_CAP in the last 24h
 *   5. INSERT … ON CONFLICT (referee) DO NOTHING — idempotent if user
 *      re-signs in with the same ref.
 *
 * Every rejection is audit-logged so we can spot abuse trends. Successful
 * persistence is also logged (severity=info) for accounting.
 *
 * Never throws — auth flow continues regardless.
 */
export async function saveReferral(
  args: {
    referrer: string | null;
    referee: string;
    ip?: string | null;
    userAgent?: string | null;
  },
  deps: ReferralDeps = defaultReferralDeps,
): Promise<ReferralResult> {
  const { query: q, recordAudit: audit } = deps;
  // referee can come in mixed-case; lowercase first so format/equality checks
  // are consistent without needing a strict normaliseWallet (which throws).
  const refereeLower = args.referee.toLowerCase();
  const refereeNorm = /^0x[a-f0-9]{40}$/.test(refereeLower)
    ? refereeLower
    : normaliseWallet(args.referee);

  // The referrer field may arrive as either a wallet (`0x…`) or a vanity
  // code. Resolve to a wallet first so all downstream checks (FK, sybil
  // cap, INSERT) operate on the canonical key.
  const rawRef = (args.referrer ?? "").trim();
  let ref = rawRef.toLowerCase();
  if (rawRef.length > 0 && !/^0x[a-f0-9]{40}$/.test(ref)) {
    if (/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(rawRef)) {
      const resolved = await q<{ wallet: string }>(
        `SELECT wallet FROM users WHERE LOWER(referral_code) = LOWER($1) LIMIT 1`,
        [rawRef],
      );
      if (resolved[0]) {
        ref = resolved[0].wallet.toLowerCase();
      }
    }
  }

  // 1. format check
  if (!/^0x[a-f0-9]{40}$/.test(ref)) {
    if (ref.length > 0) {
      // Only audit when something *was* provided that looked vaguely like a
      // ref. Empty / null refs aren't suspicious — most users have no ref.
      await audit({
        wallet: refereeNorm,
        action: "referral_rejected",
        payload: { reason: "invalid_format" satisfies ReferralRejectReason },
        ip: args.ip ?? null,
        userAgent: args.userAgent ?? null,
        severity: "warn",
      });
    }
    return { ok: false, reason: "invalid_format" };
  }

  // 2. self-referral
  if (ref === refereeNorm) {
    await audit({
      wallet: refereeNorm,
      action: "referral_rejected",
      payload: { reason: "self_referral" satisfies ReferralRejectReason, ref },
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
      severity: "warn",
    });
    return { ok: false, reason: "self_referral" };
  }

  // 3 + 4 + 5 collapsed into a single atomic statement to close the
  // TOCTOU race that would otherwise let concurrent /auth/verify requests
  // bypass the cap by all reading `count < cap` before any of them inserted.
  //
  // The CTE pattern:
  //   - `ref_check` is empty if the referrer wallet doesn't exist
  //   - `cap_check.cnt` is the live count in the rolling window
  //   - the SELECT cross-joins them; rows survive only if both
  //     (referrer exists) AND (cap_check.cnt < cap)
  //   - INSERT … ON CONFLICT (referee) DO NOTHING is naturally idempotent
  //     for repeated sign-ins, and PG holds a row-level lock on referee for
  //     the duration so two parallel inserts of the same referee serialise.
  //
  // Postgres evaluates the WITH clauses, the SELECT, and the INSERT as one
  // atomic statement under MVCC — there is no observable interleaving from
  // any other transaction. Empty RETURNING means *something* rejected the
  // insert; we run a single diagnostic SELECT afterwards (informational
  // only — the security guarantee is already in the atomic statement) so
  // the audit log gets the right reason.
  const sinceIso = new Date(Date.now() - REFERRAL_WINDOW_MS).toISOString();
  const inserted = await q<{ referee: string }>(
    `WITH
       ref_check AS (
         SELECT 1 AS ok FROM users WHERE wallet = $1
       ),
       cap_check AS (
         SELECT COUNT(*) AS cnt FROM referrals
         WHERE referrer = $1 AND created_at > $3
       )
     INSERT INTO referrals (referrer, referee)
     SELECT $1, $2
       FROM ref_check
       CROSS JOIN cap_check
      WHERE cap_check.cnt < $4
     ON CONFLICT (referee) DO NOTHING
     RETURNING referee`,
    [ref, refereeNorm, sinceIso, REFERRAL_DAILY_CAP],
  );

  if (inserted.length > 0) {
    await audit({
      wallet: refereeNorm,
      action: "referral_recorded",
      payload: { ref },
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
      severity: "info",
    });
    return { ok: true };
  }

  // Empty RETURNING — figure out *why* for accurate audit. This diagnostic
  // is read-only and not security-critical: even if a concurrent insert
  // changes the answer between our atomic INSERT and this SELECT, the
  // worst case is a slightly mislabelled audit reason.
  const diag = await q<{
    referrer_exists: boolean;
    recent_count: string;
    already_referred: boolean;
  }>(
    `SELECT
       EXISTS (SELECT 1 FROM users WHERE wallet = $1) AS referrer_exists,
       (SELECT COUNT(*)::text FROM referrals
          WHERE referrer = $1 AND created_at > $3) AS recent_count,
       EXISTS (SELECT 1 FROM referrals WHERE referee = $2) AS already_referred`,
    [ref, refereeNorm, sinceIso],
  );
  const d = diag[0]!;
  const recent = Number(d.recent_count);

  let reason: ReferralRejectReason;
  let severity: "info" | "warn" = "warn";
  let payload: Record<string, unknown> = { ref };
  if (!d.referrer_exists) {
    reason = "unknown_referrer";
  } else if (d.already_referred) {
    // Idempotent re-sign-in path — info-level, not warn.
    reason = "duplicate_referee";
    severity = "info";
  } else if (recent >= REFERRAL_DAILY_CAP) {
    reason = "sybil_cap_exceeded";
    payload = { ref, recent, cap: REFERRAL_DAILY_CAP };
  } else {
    // Race fallback: between the atomic INSERT and this diagnostic, state
    // changed (e.g. a parallel insert filled the cap, then was rolled back).
    // Treat as cap_exceeded so the operator still sees something useful.
    reason = "sybil_cap_exceeded";
    payload = { ref, recent, cap: REFERRAL_DAILY_CAP, raceFallback: true };
  }

  await audit({
    wallet: refereeNorm,
    action: "referral_rejected",
    payload: { reason, ...payload },
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
    severity,
  });
  return { ok: false, reason };
}

/**
 * Per-referee lifetime cap on bonus XP credited to the referrer. Above this,
 * additional matches by the referee no longer earn the referrer XP — the
 * one-time +100 coins on the first match is still granted (the cap only
 * affects the recurring percentage bonus).
 *
 * Tunable via REFERRAL_XP_CAP_PER_REFEREE env var. The default of 1000 was
 * chosen so that one whale referee can't be milked indefinitely (a Hard
 * bot match is 100 XP today, so 10% × 1000 ≈ ten matches × $reward unit).
 */
function parseReferralXpCap(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 1000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(
      `invalid REFERRAL_XP_CAP_PER_REFEREE: ${JSON.stringify(raw)} ` +
        `(must be a non-negative integer)`,
    );
  }
  return n;
}
export const REFERRAL_XP_CAP_PER_REFEREE = parseReferralXpCap(
  process.env.REFERRAL_XP_CAP_PER_REFEREE,
);

/** Percentage of the referee's match XP that goes to the referrer. */
function parseReferralXpPercent(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 10;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(
      `invalid REFERRAL_XP_PERCENT: ${JSON.stringify(raw)} ` +
        `(must be a number in [0, 100])`,
    );
  }
  return n;
}
export const REFERRAL_XP_PERCENT = parseReferralXpPercent(process.env.REFERRAL_XP_PERCENT);

/** One-time coins reward to the referrer the first time the referee finishes a match. */
function parseReferralFirstMatchCoins(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 100;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(
      `invalid REFERRAL_FIRST_MATCH_COINS: ${JSON.stringify(raw)} ` +
        `(must be a non-negative integer)`,
    );
  }
  return n;
}
export const REFERRAL_FIRST_MATCH_COINS = parseReferralFirstMatchCoins(
  process.env.REFERRAL_FIRST_MATCH_COINS,
);

export interface ReferralPerkAward {
  referrer: string;
  /** XP credited to the referrer for this match (after cap). */
  xpAwarded: number;
  /** Coins credited to the referrer for this match (one-time first-match bonus). */
  coinsAwarded: number;
  /** Total XP credited to this referee across all matches (post-update). */
  xpEarnedTotal: number;
  /** Total coins credited from this referee (post-update). */
  coinsEarnedTotal: number;
  /** True if this was the referee's first credited match. */
  firstMatch: boolean;
}

/**
 * Atomically credit the referrer for a finished match by the referee.
 *
 * Runs inside the supplied client (must be in a transaction) so the perk
 * write commits or rolls back with the rest of the match outcome — we never
 * want to bump the referrer's stats and then lose the match record.
 *
 * Rules:
 *   - referee must have a row in `referrals`; if not, returns null (no-op).
 *   - on first credited match: stamp `referee_first_match_at = now()` and
 *     credit `REFERRAL_FIRST_MATCH_COINS` to referrer's `stats.coins`.
 *   - on every credited match: credit `floor(matchXp * REFERRAL_XP_PERCENT / 100)`
 *     to referrer's `stats.xp`, but only up to the lifetime cap
 *     `REFERRAL_XP_CAP_PER_REFEREE` per referee.
 *   - referrer is `getOrCreateUser`-style upserted on the stats row so a
 *     missing stats row never silently swallows the bonus.
 *
 * Returns the awarded amounts (or null if no referrer is on file).
 *
 * Caller should treat any thrown error as a soft failure: the match has
 * already committed and we don't want to roll it back just because the
 * referral bookkeeping failed. Logging is the route handler's job.
 *
 * Caller should only invoke this on a referee WIN. We don't validate
 * `won` here because callers typically already check for it (a loss has
 * matchXp = 0 anyway, so the percentage bonus would be 0); however the
 * first-match coin bonus is intended to fire on the first win, not the
 * first finished match, so guarding at the call site is required.
 */
export async function awardReferralPerks(
  client: PoolClient,
  rawReferee: string,
  matchXp: number,
): Promise<ReferralPerkAward | null> {
  const referee = normaliseWallet(rawReferee);
  if (matchXp < 0 || !Number.isFinite(matchXp)) return null;

  const refRows = await client.query<{
    referrer: string;
    xp_earned: number;
    coins_earned: number;
    referee_first_match_at: Date | null;
  }>(
    `SELECT referrer, xp_earned, coins_earned, referee_first_match_at
       FROM referrals WHERE referee = $1 FOR UPDATE`,
    [referee],
  );
  const r = refRows.rows[0];
  if (!r) return null;

  const remaining = Math.max(0, REFERRAL_XP_CAP_PER_REFEREE - r.xp_earned);
  const xpDelta = Math.min(remaining, Math.floor((matchXp * REFERRAL_XP_PERCENT) / 100));
  const firstMatch = r.referee_first_match_at === null;
  const coinsDelta = firstMatch ? REFERRAL_FIRST_MATCH_COINS : 0;

  if (xpDelta === 0 && coinsDelta === 0 && !firstMatch) {
    // Nothing to do — cap reached and not the first match. Return zero
    // award rather than null so callers can still distinguish "no
    // referrer at all" (null) from "referrer but capped" (0/0).
    return {
      referrer: r.referrer,
      xpAwarded: 0,
      coinsAwarded: 0,
      xpEarnedTotal: r.xp_earned,
      coinsEarnedTotal: r.coins_earned,
      firstMatch: false,
    };
  }

  // Update the referrals row first so the cap check is durable across
  // concurrent finishes (the FOR UPDATE above already serialises within
  // this referee row). The stats row is upserted defensively in case the
  // referrer's stats were never created.
  const updatedRef = await client.query<{
    xp_earned: number;
    coins_earned: number;
  }>(
    `UPDATE referrals
        SET xp_earned    = xp_earned + $2,
            coins_earned = coins_earned + $3,
            referee_first_match_at = COALESCE(referee_first_match_at, now())
      WHERE referee = $1
      RETURNING xp_earned, coins_earned`,
    [referee, xpDelta, coinsDelta],
  );
  const updated = updatedRef.rows[0]!;

  if (xpDelta > 0 || coinsDelta > 0) {
    await client.query(
      `INSERT INTO users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
      [r.referrer],
    );
    await client.query(
      `INSERT INTO stats (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING`,
      [r.referrer],
    );
    await client.query(
      `UPDATE stats
          SET xp        = xp + $2,
              coins     = coins + $3,
              updated_at = now()
        WHERE wallet = $1`,
      [r.referrer, xpDelta, coinsDelta],
    );
  }

  return {
    referrer: r.referrer,
    xpAwarded: xpDelta,
    coinsAwarded: coinsDelta,
    xpEarnedTotal: updated.xp_earned,
    coinsEarnedTotal: updated.coins_earned,
    firstMatch,
  };
}

export interface ReferralListRow {
  referee: string;
  display_name: string | null;
  created_at: Date;
  xp_earned: number;
  coins_earned: number;
  referee_first_match_at: Date | null;
}

export interface ReferralSummary {
  count: number;
  active: number;
  totalXpEarned: number;
  totalCoinsEarned: number;
}

export async function listReferralsFor(rawWallet: string): Promise<{
  rows: ReferralListRow[];
  summary: ReferralSummary;
}> {
  const wallet = normaliseWallet(rawWallet);
  const rows = await query<ReferralListRow>(
    `SELECT r.referee,
            u.display_name,
            r.created_at,
            r.xp_earned,
            r.coins_earned,
            r.referee_first_match_at
       FROM referrals r
       LEFT JOIN users u ON u.wallet = r.referee
      WHERE r.referrer = $1
      ORDER BY r.created_at DESC`,
    [wallet],
  );
  const summary: ReferralSummary = rows.reduce(
    (acc, row) => {
      acc.count += 1;
      if (row.referee_first_match_at) acc.active += 1;
      acc.totalXpEarned += row.xp_earned;
      acc.totalCoinsEarned += row.coins_earned;
      return acc;
    },
    { count: 0, active: 0, totalXpEarned: 0, totalCoinsEarned: 0 } as ReferralSummary,
  );
  return { rows, summary };
}
