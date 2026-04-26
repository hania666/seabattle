/**
 * Anti-sybil: track which IPs touch which wallets, and refuse new
 * sign-ins from an IP that has already linked too many distinct wallets
 * recently (Phase 8.9).
 *
 * The `ip_wallet_link` table is upserted on every successful SIWE
 * verification. `countDistinctWalletsForIp` then asks how many distinct
 * wallets that IP has signed in to in the last `windowHours` hours.
 * Above the threshold we refuse the new login: the user almost certainly
 * has a legitimate wallet they can keep using, and an attacker's bulk
 * account-creation script is forced to either burn IP rotation costs or
 * give up.
 *
 * Soft, recoverable rule: the `v_sybil_candidates` view (in schema.sql)
 * surfaces the same data for an admin dashboard so we can manually
 * review and unblock genuine multi-wallet households.
 */
import { query } from "./db";

/**
 * Hard cap: 5 distinct wallets per IP per 24 hours. Above this, new
 * sign-ins from the IP are rejected with `sybil_cap_exceeded`. The
 * rolling sybil view (schema.sql) flags 3+ distinct wallets as a
 * "candidate" — that's a softer threshold for human review, not an
 * auto-block.
 */
export const SYBIL_MAX_WALLETS_PER_IP_24H = 5;
export const SYBIL_WINDOW_HOURS = 24;

/**
 * Record (or refresh) the (ip, wallet) link. Idempotent — a repeated
 * link from the same pair just bumps `hit_count` and `last_seen`.
 *
 * `ip` is nullable so requests behind a proxy that strips the header
 * still go through (we just can't enforce sybil for them; they fall
 * back to global rate limits).
 */
export async function linkIpToWallet(
  ip: string | null,
  wallet: string,
): Promise<void> {
  if (!ip) return;
  await query(
    `INSERT INTO ip_wallet_link (ip, wallet, first_seen, last_seen, hit_count)
     VALUES ($1, $2, now(), now(), 1)
     ON CONFLICT (ip, wallet) DO UPDATE SET
        last_seen = now(),
        hit_count = ip_wallet_link.hit_count + 1`,
    [ip, wallet],
  );
}

/**
 * How many DISTINCT wallets have linked to this IP in the last
 * `windowHours` hours. Doesn't include the wallet about to sign in
 * (caller decides whether the new wallet pushes over the cap).
 *
 * `null` IP returns 0 — proxies that strip the header don't get
 * sybil-checked.
 */
export async function countDistinctWalletsForIp(
  ip: string | null,
  windowHours: number = SYBIL_WINDOW_HOURS,
): Promise<number> {
  if (!ip) return 0;
  const rows = await query<{ wallet_count: string }>(
    `SELECT COUNT(DISTINCT wallet)::text AS wallet_count
       FROM ip_wallet_link
      WHERE ip = $1
        AND last_seen > now() - ($2 || ' hours')::INTERVAL`,
    [ip, String(windowHours)],
  );
  return Number(rows[0]?.wallet_count ?? 0);
}

/**
 * True iff adding `wallet` to `ip` would put it over the cap. Tolerates
 * the wallet itself already being linked — only NEW pairings count.
 */
export async function wouldExceedSybilCap(
  ip: string | null,
  wallet: string,
): Promise<boolean> {
  if (!ip) return false;
  const rows = await query<{ wallet_count: string; has_self: boolean }>(
    `SELECT
       COUNT(DISTINCT wallet)::text AS wallet_count,
       BOOL_OR(wallet = $2) AS has_self
       FROM ip_wallet_link
      WHERE ip = $1
        AND last_seen > now() - ($3 || ' hours')::INTERVAL`,
    [ip, wallet, String(SYBIL_WINDOW_HOURS)],
  );
  const count = Number(rows[0]?.wallet_count ?? 0);
  const hasSelf = rows[0]?.has_self ?? false;
  // If the wallet is already linked, a sign-in doesn't add to the
  // distinct count and is always allowed (caller is genuine, just
  // re-authing). Otherwise, the link would push the count by one.
  if (hasSelf) return false;
  return count + 1 > SYBIL_MAX_WALLETS_PER_IP_24H;
}
