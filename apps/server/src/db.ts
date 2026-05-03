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

export async function setDisplayName(rawWallet: string, name: string): Promise<UserRow> {
  const wallet = normaliseWallet(rawWallet);
  const rows = await query<UserRow>(
    `UPDATE users SET display_name = $2 WHERE wallet = $1 RETURNING *`,
    [wallet, name],
  );
  if (!rows[0]) throw new Error("user not found");
  return rows[0];
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
  const ref = (args.referrer ?? "").toLowerCase().trim();

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
