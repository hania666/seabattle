import "dotenv/config";
import { initSentry, Sentry, captureException } from "./sentry";
initSentry();

import http from "node:http";
import path from "node:path";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { loadEnv } from "./env";
import { registerSocketHandlers } from "./socket";
import { signResult } from "./signer";
import { createFileStore, topN, type LeaderboardEntry } from "./leaderboard";
import { closePool, isDbConfigured, pingDb } from "./db";
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
  return res.status(status.ok ? 200 : 503).json(status);
});

const authEnv: AuthEnv | null = loadAuthEnv();

function clientIp(req: express.Request): string | null {
  const fwd = req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
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
  try {
    const out = await verifyAndIssueJwt(message, signature, authEnv, clientIp(req));
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
 * POST /api/bot-result
 * Body: { matchId: 0x..., player: 0x..., won: boolean }
 * Returns: { signature, digest, botMatchAddress, chainId }
 *
 * This is the PvE equivalent of `match:end`. The frontend calls this after the
 * local bot match completes to obtain a signature that `BotMatch.recordResult`
 * will accept. Since PvE is single-player, the server trusts the claimed
 * outcome today; Phase 7 can add fraud-proofs if we care.
 */
app.post("/api/bot-result", async (req, res) => {
  const { matchId, player, won } = req.body ?? {};
  if (!/^0x[a-fA-F0-9]{64}$/.test(matchId ?? "")) {
    return res.status(400).json({ error: "invalid matchId" });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(player ?? "")) {
    return res.status(400).json({ error: "invalid player address" });
  }
  if (typeof won !== "boolean") {
    return res.status(400).json({ error: "won must be boolean" });
  }
  if (!env.botMatchAddress) {
    return res.status(503).json({ error: "BOT_MATCH_ADDRESS not configured" });
  }
  const signature = await signResult(env.signer, {
    chainId: env.chainId,
    botMatchAddress: env.botMatchAddress,
    matchId,
    player,
    won,
  });
  return res.json({
    signature,
    botMatchAddress: env.botMatchAddress,
    chainId: env.chainId,
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
 * POST /api/leaderboard/submit — client-signed XP update. Body:
 * { address, xp, wins, losses, rankKey, nonce, signature }.
 */
app.post("/api/leaderboard/submit", async (req, res) => {
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
});

Sentry.setupExpressErrorHandler(app);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.corsOrigin },
});

registerSocketHandlers(io, env);

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
