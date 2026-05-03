-- Sea Battle — Phase 8 schema (server-authoritative state)
-- Apply via: psql "$DATABASE_URL" -f apps/server/db/schema.sql
-- Idempotent (CREATE IF NOT EXISTS) so it can be re-run safely.

-- 1. users — wallet identity, ban state, soft metadata
CREATE TABLE IF NOT EXISTS users (
  wallet           TEXT PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  banned_at        TIMESTAMPTZ,
  banned_reason    TEXT,
  ip_country       TEXT,
  display_name     TEXT,
  CONSTRAINT users_display_name_unique UNIQUE (display_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_ci ON users (LOWER(display_name));

-- 2. stats — coins, xp, win/loss, streaks (one row per wallet)
CREATE TABLE IF NOT EXISTS stats (
  wallet                 TEXT PRIMARY KEY REFERENCES users(wallet) ON DELETE CASCADE,
  xp                     INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  coins                  INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  pve_wins               INTEGER NOT NULL DEFAULT 0 CHECK (pve_wins >= 0),
  pve_losses             INTEGER NOT NULL DEFAULT 0 CHECK (pve_losses >= 0),
  pvp_wins               INTEGER NOT NULL DEFAULT 0 CHECK (pvp_wins >= 0),
  pvp_losses             INTEGER NOT NULL DEFAULT 0 CHECK (pvp_losses >= 0),
  current_win_streak     INTEGER NOT NULL DEFAULT 0 CHECK (current_win_streak >= 0),
  longest_win_streak     INTEGER NOT NULL DEFAULT 0 CHECK (longest_win_streak >= 0),
  last_match_at          TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. inventory — owned powerups (server is source of truth)
CREATE TABLE IF NOT EXISTS inventory (
  wallet       TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  powerup_id   TEXT NOT NULL CHECK (powerup_id IN ('bomb', 'radar', 'torpedo', 'shield')),
  count        INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0 AND count <= 5),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet, powerup_id)
);

-- 4. achievements — unlocked + progress per wallet
CREATE TABLE IF NOT EXISTS achievements (
  wallet        TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  ach_id        TEXT NOT NULL,
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  unlocked_at   TIMESTAMPTZ,
  PRIMARY KEY (wallet, ach_id)
);

-- 5. matches — every PvE/PvP match the server saw (anti-cheat audit + on-chain claim digest)
CREATE TABLE IF NOT EXISTS matches (
  id                TEXT PRIMARY KEY,
  mode              TEXT NOT NULL CHECK (mode IN ('pve', 'pvp_classic', 'pvp_arcade')),
  difficulty        TEXT,
  host_wallet       TEXT REFERENCES users(wallet) ON DELETE SET NULL,
  opponent_wallet   TEXT REFERENCES users(wallet) ON DELETE SET NULL,
  winner_wallet     TEXT,
  seed              TEXT,
  move_log          JSONB,
  result            JSONB,
  signed_digest     TEXT,
  contract_match_id TEXT,
  status            TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'finished', 'rejected', 'timed_out')),
  rejected_reason   TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  claimed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS matches_host_idx     ON matches (host_wallet, started_at DESC);
CREATE INDEX IF NOT EXISTS matches_opponent_idx ON matches (opponent_wallet, started_at DESC);
CREATE INDEX IF NOT EXISTS matches_status_idx   ON matches (status);

-- 6. daily_claims — log of daily crate redemptions, primary key for anti-farm
CREATE TABLE IF NOT EXISTS daily_claims (
  wallet         TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bomb_added     INTEGER NOT NULL DEFAULT 0,
  radar_added    INTEGER NOT NULL DEFAULT 0,
  coins_added    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (wallet, claimed_at)
);
CREATE INDEX IF NOT EXISTS daily_claims_wallet_idx ON daily_claims (wallet, claimed_at DESC);

-- 7. audit_log — every server-side mutation + anti-cheat decisions
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  wallet       TEXT,
  action       TEXT NOT NULL,
  payload      JSONB,
  ip           TEXT,
  user_agent   TEXT,
  severity     TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'cheat', 'ban')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_wallet_idx   ON audit_log (wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_severity_idx ON audit_log (severity, created_at DESC);

-- 8. nonces — SIWE challenge nonces (one-time-use, expire after 5 minutes)
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce        TEXT PRIMARY KEY,
  wallet       TEXT NOT NULL,
  ip           TEXT,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);
CREATE INDEX IF NOT EXISTS auth_nonces_wallet_idx ON auth_nonces (wallet, issued_at DESC);

-- 9. ip_link — soft tracking of which IPs touched which wallets (anti-sybil signal)
CREATE TABLE IF NOT EXISTS ip_wallet_link (
  ip           TEXT NOT NULL,
  wallet       TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, wallet)
);
CREATE INDEX IF NOT EXISTS ip_wallet_link_wallet_idx ON ip_wallet_link (wallet);
CREATE INDEX IF NOT EXISTS ip_wallet_link_ip_idx     ON ip_wallet_link (ip);

-- helper view: IPs touched by >=3 distinct wallets in last 24h (sybil candidates).
-- Threshold is 3 (not 2) so a couple sharing a router doesn't trip the alert.
CREATE OR REPLACE VIEW v_sybil_candidates AS
SELECT ip, COUNT(DISTINCT wallet) AS wallet_count, ARRAY_AGG(wallet) AS wallets
FROM ip_wallet_link
WHERE last_seen > now() - INTERVAL '24 hours'
GROUP BY ip
HAVING COUNT(DISTINCT wallet) >= 3;

-- helper trigger: bump stats.updated_at automatically on row update
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stats_touch_updated_at ON stats;
CREATE TRIGGER stats_touch_updated_at
  BEFORE UPDATE ON stats
  FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS inventory_touch_updated_at ON inventory;
CREATE TRIGGER inventory_touch_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();


-- 10. referrals
CREATE TABLE IF NOT EXISTS referrals (
  referrer     TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  referee      TEXT NOT NULL REFERENCES users(wallet) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (referee)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer, created_at DESC);

-- migration version table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations (version) VALUES ('001_phase8_init')
ON CONFLICT (version) DO NOTHING;

-- ===========================================================================
-- 12. pair_history — anti-collusion: row-per-pairing for daily cap enforcement
-- Replaces the in-memory Map<pairKey, count> used during Phase 9 beta. The
-- in-memory store reset on every deploy / machine restart and was useless
-- if a future deploy ever ran more than one Fly machine — both bypassing
-- the cap. Row-per-pairing with a (pair_key, paired_at) index is cheap to
-- count and trivial to prune.
CREATE TABLE IF NOT EXISTS pair_history (
  pair_key     TEXT NOT NULL,           -- "0x<lower>:0x<higher>" (sorted, lowercased)
  paired_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pair_history_key_time_idx
  ON pair_history (pair_key, paired_at DESC);
CREATE INDEX IF NOT EXISTS pair_history_paired_at_idx
  ON pair_history (paired_at);

-- Audit L5: retention helpers
-- ===========================================================================
-- We don't run pg_cron in our managed Postgres, so retention is enforced by
-- a periodic call to the `prune_audit_data()` function below — wire it up
-- from your cron / scheduled job runner. Defaults:
--   * audit_log:    keep 180 days (anti-cheat investigations rarely reach
--                   that far back, and the table can balloon if not pruned)
--   * auth_nonces:  delete anything past `expires_at` + 1 day (we already
--                   only verify within 5 minutes; keeping a day of expired
--                   rows is enough to debug stuck-auth reports without
--                   bloating the index)
--   * ip_wallet_link: keep 90 days of last_seen (sybil view only looks at
--                     24h, and after 90d the signal is stale anyway)
-- ===========================================================================
CREATE OR REPLACE FUNCTION prune_audit_data(
  audit_log_days       INTEGER DEFAULT 180,
  auth_nonces_days     INTEGER DEFAULT 1,
  ip_link_days         INTEGER DEFAULT 90,
  pair_history_days    INTEGER DEFAULT 7
) RETURNS TABLE (
  pruned_audit_log       BIGINT,
  pruned_auth_nonces     BIGINT,
  pruned_ip_link         BIGINT,
  pruned_pair_history    BIGINT
) AS $$
DECLARE
  a BIGINT;
  n BIGINT;
  i BIGINT;
  p BIGINT;
BEGIN
  DELETE FROM audit_log
   WHERE created_at < now() - make_interval(days => audit_log_days);
  GET DIAGNOSTICS a = ROW_COUNT;

  DELETE FROM auth_nonces
   WHERE expires_at < now() - make_interval(days => auth_nonces_days);
  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM ip_wallet_link
   WHERE last_seen < now() - make_interval(days => ip_link_days);
  GET DIAGNOSTICS i = ROW_COUNT;

  -- pair_history: cap window is 24h, keep an extra few days for forensics
  DELETE FROM pair_history
   WHERE paired_at < now() - make_interval(days => pair_history_days);
  GET DIAGNOSTICS p = ROW_COUNT;

  RETURN QUERY SELECT a, n, i, p;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION prune_audit_data(INTEGER, INTEGER, INTEGER, INTEGER) IS
  'Deletes rows older than the given retention windows from audit_log, auth_nonces, ip_wallet_link, pair_history. Call daily from a scheduler.';
