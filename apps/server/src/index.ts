import "dotenv/config";
import { initSentry, Sentry, captureException } from "./sentry";
initSentry();

import http from "node:http";
import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";
import { loadEnv } from "./env";
import { registerSocketHandlers } from "./socket";
import { createFileStore, topN, type LeaderboardEntry } from "./leaderboard";
import { closePool, getStats, getUser, isDbConfigured, normaliseWallet, pingDb, query, recordAudit, saveReferral, setDisplayName } from "./db";
import {
  AuthError,
  issueNonce,
  loadAuthEnv,
  requireAuth,
  verifyAndIssueJwt,
  type AuthEnv,
} from "./auth";
import {
  loadStatsForWallet,
  mergeStats,
  parseClientStats,
  StatsValidationError,
} from "./stats";
import {
  finishPveMatch,
  parseChainMatchId,
  parseDifficulty,
  PveError,
  startPveMatch,
} from "./pve";
import { authLimiter, globalLimiter, pveStartLimiter } from "./middleware/rateLimit";

const leaderboardPath =
  process.env.LEADERBOARD_PATH ?? path.resolve(process.cwd(), "data/leaderboard.json");
const leaderboard = createFileStore(leaderboardPath);

const env = loadEnv();

const app = express();
// Behind a Cloudflare / Fly proxy `req.ip` returns the proxy's address
// unless we tell express to trust the first hop. Without this our
// per-IP rate limits would key every request to the same proxy IP.
app.set("trust proxy", 1);

// Sentry per-request isolation scope. Without this, `Sentry.setUser()`
// (called from `requireAuth`) mutates the global scope and the wallet
// of one request leaks into concurrent / subsequent requests. We pass
// `integrations: []` to `Sentry.init` (no auto-instrumentation), which
// also turns off the http integration that would normally fork an
// isolation scope per request — so we fork one ourselves here.
app.use((_req, _res, next) => {
  Sentry.withIsolationScope(() => next());
});

// Security headers (Phase 8.10). The API doesn't render HTML so a real
// CSP would be redundant — `script-src 'none'` shuts the door on JSON
// responses being interpreted as scripts via prototype-pollution-style
// abuse. Helmet's other defaults (HSTS, X-Content-Type-Options,
// Referrer-Policy, X-Frame-Options DENY, X-DNS-Prefetch-Control off,
// origin-agent-cluster, X-Download-Options, X-Permitted-Cross-Domain-
// Policies, Cross-Origin-Resource-Policy same-origin) are kept on.
//
// HSTS is only meaningful behind TLS, but it's harmless on plaintext
// (browser ignores it); turning it on now means we don't forget once
// we're in front of a domain.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'none'"],
        "script-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Global rate limit (100 req/min per IP). Applied first so an attacker
// can't bypass the auth/PvE limits by spamming /health.
app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "sea3battle-server",
    ts: Date.now(),
    signer: env.signer.address,
    chainId: env.chainId,
    lobbyAddress: env.lobbyAddress,
    botMatchAddress: env.botMatchAddress,
    db: isDbConfigured() ? "configured" : "disabled",
  });
});

app.get("/healthz/db", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ ok: false, error: "DATABASE_URL not set" });
  }
  const status = await pingDb();
  if (status.ok) {
    return res.status(200).json(status);
  }
  // Don't leak the raw driver error (could include hostnames or
  // connection-string fragments). Log the detail for ops; return a
  // sanitised code to the public.
  console.error("[healthz] db ping failed:", status.error);
  captureException(new Error(status.error), { route: "/healthz/db" });
  return res.status(503).json({ ok: false, error: "db_unreachable" });
});

const authEnv: AuthEnv | null = loadAuthEnv();

function clientIp(req: express.Request): string | null {
  // We rely on `app.set('trust proxy', 1)` (above): express then walks the
  // `X-Forwarded-For` chain from the right and returns the first untrusted
  // hop in `req.ip`. That's the real client. The previous implementation
  // took the LEFTMOST forwarded-for entry, which is attacker-controlled
  // (any client can prepend their own X-Forwarded-For; the proxy appends
  // theirs after) and would let an attacker bypass the sybil cap by
  // varying the header per request. We trust express's resolution.
  return req.ip ?? null;
}

/**
 * POST /auth/nonce
 * Body: { wallet: 0x... }
 * Returns: { nonce, domain, chainId, statement, expiresInSeconds }
 *
 * The client builds an EIP-4361 message embedding `nonce` and `domain`,
 * has the user sign it (no gas), then POSTs back to /auth/verify.
 */
app.post("/auth/nonce", authLimiter, async (req, res) => {
  if (!authEnv) {
    return res.status(503).json({ error: "auth not configured" });
  }
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "database not configured" });
  }
  const wallet = (req.body?.wallet ?? "").toString();
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: "invalid wallet" });
  }
  try {
    const nonce = await issueNonce(wallet, clientIp(req));
    return res.json({
      nonce,
      domain: authEnv.expectedDomain,
      chainId: authEnv.expectedChainId,
      // English-only by design — SIWE messages are signed verbatim and we
      // need a stable string for replay/deduplication on the server side.
      // Localising would also fragment the audit trail.
      statement: "Sign in to SeaBattle.",
      expiresInSeconds: 5 * 60,
    });
  } catch (e) {
    captureException(e, { route: "/auth/nonce", wallet });
    return res.status(500).json({ error: "nonce issuance failed" });
  }
});

/**
 * POST /auth/verify
 * Body: { message: string, signature: 0x... }
 * Returns: { token, wallet, expiresAt } on success.
 *
 * `message` is the full EIP-4361 string the client built; `signature` is the
 * AGW's `personal_sign` output. JWT is HS256, valid 24h.
 */
app.post("/auth/verify", authLimiter, async (req, res) => {
  if (!authEnv) {
    return res.status(503).json({ error: "auth not configured" });
  }
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "database not configured" });
  }
  const message = (req.body?.message ?? "").toString();
  const signature = (req.body?.signature ?? "").toString();
  if (!message || !/^0x[a-fA-F0-9]+$/.test(signature)) {
    return res.status(400).json({ error: "invalid message or signature" });
  }
  const ref = typeof req.body?.ref === "string" ? req.body.ref : null;
  try {
    const out = await verifyAndIssueJwt(message, signature, authEnv, clientIp(req));
    // Persist referral with anti-sybil + audit guarantees. Best-effort:
    // never blocks auth (own try/catch in case of DB hiccup).
    if (ref) {
      saveReferral({
        referrer: ref,
        referee: out.wallet,
        ip: clientIp(req),
        userAgent: req.get("user-agent") ?? null,
      }).catch((e) => {
        captureException(e, { route: "/auth/verify", subroutine: "saveReferral" });
      });
    }
    return res.json(out);
  } catch (e) {
    if (e instanceof AuthError) {
      // Map AuthError codes onto HTTP status:
      //   banned             → 403  (account-level block, not a credentials issue)
      //   sybil_cap_exceeded → 429  (policy/rate-limit, signature was valid)
      //   everything else    → 401  (auth failure proper)
      // The 429 mapping for sybil is important: 401 would let a client
      // re-prompt the wallet for another signature, burning the user's
      // trust on a problem signing again won't fix.
      const status =
        e.code === "banned"
          ? 403
          : e.code === "sybil_cap_exceeded"
          ? 429
          : 401;
      return res.status(status).json({ error: e.message, code: e.code });
    }
    captureException(e, { route: "/auth/verify" });
    return res.status(500).json({ error: "verification failed" });
  }
});

/**
 * GET /api/stats/me
 * Returns the authenticated wallet's stats from Postgres. The JWT is the
 * only acceptable identifier — `req.wallet` comes from `requireAuth`.
 * Returns `{ stats: null }` if the wallet has no stats row yet (e.g. the
 * user signed in but has never synced).
 */
if (authEnv) {
  app.get("/api/stats/me", requireAuth(authEnv), async (req, res) => {
    if (!isDbConfigured()) {
      return res.status(503).json({ error: "database not configured" });
    }
    try {
      const stats = await loadStatsForWallet(req.wallet!);
      return res.json({ stats });
    } catch (e) {
      captureException(e, { route: "GET /api/stats/me", wallet: req.wallet });
      return res.status(500).json({ error: "stats lookup failed" });
    }
  });

  /**
   * POST /api/stats/me/sync
   * Body: ClientStats — counters from localStorage. Server takes
   * `MAX(server, client)` for every counter and returns the merged row.
   * Idempotent and replay-safe; safe to call repeatedly.
   */
  /**
   * POST /api/pve/start
   * Body: { matchId: bytes32-hex, difficulty: "easy"|"normal"|"hard" }
   * Returns: { matchId, seed, difficulty }
   *
   * `matchId` is the bytes32 returned by `BotMatch.playBot()` on the chain
   * (the client parses it from the `BotMatchStarted` event). The server
   * doesn't issue its own id because the contract's `recordResult` only
   * accepts signatures over the chain-issued one. The server's
   * contribution is the `seed` — the client uses it to deterministically
   * place the bot fleet, and the server re-derives the same fleet during
   * `/api/pve/finish` to verify the user's claimed hits cover it.
   *
   * Idempotent: calling twice with the same `matchId` returns the same
   * `seed` so the client can safely retry on flaky network.
   */
  app.post("/api/pve/start", requireAuth(authEnv), pveStartLimiter, async (req, res) => {
    if (!isDbConfigured()) {
      return res.status(503).json({ error: "database not configured" });
    }
    if (!env.botMatchAddress) {
      return res.status(503).json({ error: "BOT_MATCH_ADDRESS not configured" });
    }
    try {
      const matchId = parseChainMatchId(req.body?.matchId);
      const difficulty = parseDifficulty(req.body?.difficulty);
      const out = await startPveMatch(req.wallet!, difficulty, matchId);
      return res.json(out);
    } catch (e) {
      if (e instanceof PveError) {
        return res.status(e.status).json({ error: e.code });
      }
      captureException(e, { route: "POST /api/pve/start", wallet: req.wallet });
      return res.status(500).json({ error: "pve start failed" });
    }
  });

  /**
   * POST /api/pve/finish
   * Body: { matchId, won, userShips, moveLog }
   * Returns: { signature, matchId, won } on success.
   *
   * Validates wallet/match status, structural fleet + move-log shape, and
   * the win claim against the bot fleet derived from the stored seed. On
   * success, marks the match `finished` and bumps the wallet's stats. On
   * failure, marks `rejected` with a reason and audit-logs at `cheat`
   * severity. Replaces the legacy `/api/bot-result` (which still works
   * unauthed, for now, but won't be linked from the client after PR #23).
   */
  app.post("/api/pve/finish", requireAuth(authEnv), async (req, res) => {
    if (!isDbConfigured()) {
      return res.status(503).json({ error: "database not configured" });
    }
    try {
      const out = await finishPveMatch(req.wallet!, req.body ?? {}, {
        signer: env.signer,
        chainId: env.chainId,
        botMatchAddress: env.botMatchAddress ?? null,
      });
      return res.json(out);
    } catch (e) {
      if (e instanceof PveError) {
        return res.status(e.status).json({ error: e.code });
      }
      captureException(e, { route: "POST /api/pve/finish", wallet: req.wallet });
      return res.status(500).json({ error: "pve finish failed" });
    }
  });

  app.post("/api/stats/me/sync", requireAuth(authEnv), async (req, res) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", "2026-09-01");
    if (!isDbConfigured()) {
      return res.status(503).json({ error: "database not configured" });
    }
    let parsed;
    try {
      parsed = parseClientStats(req.body);
    } catch (e) {
      if (e instanceof StatsValidationError) {
        return res.status(400).json({ error: e.message, field: e.field });
      }
      throw e;
    }
    // Audit suspiciously large single-call jumps (potential farming).
    const suspicious =
      (parsed.xp ?? 0) > 5000 ||
      (parsed.pvpWins ?? 0) > 50 ||
      (parsed.pveWins ?? 0) > 50;
    if (suspicious) {
      void recordAudit({
        wallet: req.wallet!,
        action: "stats.sync.suspicious",
        payload: parsed as unknown as Record<string, unknown>,
        ip: clientIp(req),
        severity: "warn",
      });
    }
    try {
      const merged = await mergeStats(req.wallet!, parsed);
      return res.json({ stats: merged });
    } catch (e) {
      captureException(e, {
        route: "POST /api/stats/me/sync",
        wallet: req.wallet,
      });
      return res.status(500).json({ error: "stats sync failed" });
    }
  });
}

/**
 * POST /api/bot-result — REMOVED (security audit C1).
 *
 * Until 2026-04-27 this route signed `(matchId, player, won)` for any caller
 * with no auth, no rate-limit, no fleet check, no replay validator. That
 * made it trivial to mint XP signatures for `BotMatch.recordResult` after
 * paying only the entry fee — completely bypassing every anti-cheat layer
 * shipped in Phase 8.6 / 8.7 / 8.8.
 *
 * The web client moved to `/api/pve/start` + `/api/pve/finish` (PR #24);
 * nothing legitimate calls this path anymore. We respond 410 Gone so any
 * stale client surfaces a clear error instead of silently failing.
 */
app.post("/api/bot-result", (_req, res) => {
  return res.status(410).json({
    error: "endpoint removed",
    message: "use POST /api/pve/start + POST /api/pve/finish (requires SIWE auth)",
  });
});

/**
 * GET /api/leaderboard?limit=20 — top N players by XP.
 */
app.get("/api/leaderboard", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20) || 20, 1), 100);
  try {
    const all = await leaderboard.load();
    return res.json({
      top: topN(all, limit),
      total: all.length,
      updatedAt: Date.now(),
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * GET /api/profile/me — current user profile (wallet + display_name + stats).
 */
if (authEnv) {
  app.get("/api/profile/me", requireAuth(authEnv), async (req, res) => {
    if (!isDbConfigured()) return res.status(503).json({ error: "database not configured" });
    try {
      const [user, stats] = await Promise.all([
        getUser(req.wallet!),
        getStats(req.wallet!),
      ]);
      return res.json({ user, stats });
    } catch (e) {
      captureException(e, { route: "GET /api/profile/me" });
      return res.status(500).json({ error: "failed to load profile" });
    }
  });
}

/**
 * POST /api/profile/username — set or update display name.
 * Body: { username: string }
 * Rules: 3-20 chars, letters/digits/underscores, must start with a letter.
 */
if (authEnv) {
  app.post("/api/profile/username", requireAuth(authEnv), async (req, res) => {
    if (!isDbConfigured()) return res.status(503).json({ error: "database not configured" });
    const raw = (req.body?.username ?? "").toString().trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(raw)) {
      return res.status(400).json({
        error: "username must be 3-20 chars, start with a letter, letters/digits/underscores only",
      });
    }
    try {
      const user = await setDisplayName(req.wallet!, raw);
      return res.json({ ok: true, user });
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return res.status(409).json({ error: "username already taken" });
      }
      captureException(e, { route: "POST /api/profile/username" });
      return res.status(500).json({ error: "failed to set username" });
    }
  });
}


/**
 * GET /api/referrals — list wallets referred by the authenticated user.
 */
if (authEnv) {
  app.get("/api/referrals", requireAuth(authEnv), async (req, res) => {
    if (!isDbConfigured()) return res.status(503).json({ error: "database not configured" });
    try {
      const rows = await query<{ referee: string; created_at: string }>(
        "SELECT referee, created_at FROM referrals WHERE referrer = $1 ORDER BY created_at DESC",
        [req.wallet!],
      );
      return res.json({ referrals: rows, count: rows.length });
    } catch (e) {
      captureException(e, { route: "GET /api/referrals" });
      return res.status(500).json({ error: "failed to load referrals" });
    }
  });
}


/**
 * POST /api/leaderboard/submit — client-signed XP update. Body:
 * { address, xp, wins, losses, rankKey, nonce, signature }.
 *
 * Audit M2: when SIWE auth is configured we require a JWT and that the
 * authenticated wallet matches the body's `address`. The per-entry EIP-191
 * signature stays as defence-in-depth (and proves the wallet authorised
 * the *specific* numbers); requireAuth additionally prevents a logged-out
 * attacker from spamming submits with throwaway wallets, and ensures we
 * always see the requesting IP linked to a known wallet via the JWT.
 */
const leaderboardSubmit: import("express").RequestHandler = async (req, res) => {
  const body = req.body as Partial<LeaderboardEntry> & {
    nonce?: number;
    signature?: `0x${string}`;
  };
  if (
    typeof body.address !== "string" ||
    typeof body.xp !== "number" ||
    typeof body.wins !== "number" ||
    typeof body.losses !== "number" ||
    typeof body.rankKey !== "string" ||
    typeof body.nonce !== "number" ||
    typeof body.signature !== "string"
  ) {
    return res.status(400).json({ error: "invalid payload" });
  }
  if (req.wallet && req.wallet !== body.address.toLowerCase()) {
    return res.status(403).json({ error: "address does not match auth token" });
  }
  const dbStats = await getStats(normaliseWallet(body.address as string));
  if (dbStats) {
    if (body.xp > dbStats.xp)
      return res.status(403).json({ error: "xp exceeds earned amount" });
    if (body.wins > dbStats.pve_wins + dbStats.pvp_wins)
      return res.status(403).json({ error: "wins exceed recorded amount" });
    if (body.losses > dbStats.pve_losses + dbStats.pvp_losses)
      return res.status(403).json({ error: "losses exceed recorded amount" });
  }
  try {
    const entry = await leaderboard.submit({
      address: body.address as `0x${string}`,
      xp: body.xp,
      wins: body.wins,
      losses: body.losses,
      rankKey: body.rankKey,
      nonce: body.nonce,
      signature: body.signature,
    });
    return res.json({ ok: true, entry });
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
};
if (authEnv) {
  app.post("/api/leaderboard/submit", requireAuth(authEnv), leaderboardSubmit);
} else {
  // Dev / unauthed deployments fall back to the legacy signature-only path.
  app.post("/api/leaderboard/submit", leaderboardSubmit);
}

Sentry.setupExpressErrorHandler(app);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.corsOrigin },
});

registerSocketHandlers(io, env, authEnv);

process.on("unhandledRejection", (reason) => {
  captureException(reason, { source: "unhandledRejection" });
  void Sentry.flush(2000).finally(() => process.exit(1));
});
process.on("uncaughtException", (err) => {
  captureException(err, { source: "uncaughtException" });
  void Sentry.flush(2000).finally(() => process.exit(1));
});

server.listen(env.port, () => {
  console.log(`[sea3battle-server] listening on :${env.port}`);
  console.log(`[sea3battle-server] signer: ${env.signer.address}`);
  console.log(`[sea3battle-server] db: ${isDbConfigured() ? "configured" : "disabled"}`);
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[sea3battle-server] received ${signal}, shutting down`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closePool();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
