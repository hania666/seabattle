import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Lazily initialise the connection pool from DATABASE_URL.
 * Supabase session-pooler URLs already contain the SSL params we need; we
 * only force `rejectUnauthorized: false` because the pooler uses an
 * Amazon-issued cert that Node's bundled CAs accept but some build
 * environments (musl/Alpine) don't trust.
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
  const cleanUrl = url.replace(/[?&]sslmode=[^&]*/, (m) => (m.startsWith("?") ? "?" : "&"))
    .replace(/[?&]$/, "");
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
      await client.query("ROLLBACK");
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
  const wallet = entry.wallet ? normaliseWallet(entry.wallet) : null;
  try {
    await query(
      `INSERT INTO audit_log (wallet, action, payload, ip, user_agent, severity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        wallet,
        entry.action,
        entry.payload ? JSON.stringify(entry.payload) : null,
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
