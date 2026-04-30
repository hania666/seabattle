/**
 * Rate-limit middleware factories (Phase 8.9).
 *
 * Three layers, in increasing strictness:
 *
 *   - `globalLimiter`: 100 requests/minute per IP. Applied to every route
 *     so a single host can't flood the server. Misses behind a proxy
 *     unless `app.set("trust proxy", 1)` is on (which `index.ts` does).
 *
 *   - `authLimiter`: 10 requests/minute per IP, scoped to /auth/*.
 *     Tighter because the SIWE flow is the most expensive endpoint
 *     (RPC round-trip, signature verification) and the most attractive
 *     target for credential-stuffing.
 *
 *   - `pveStartLimiter`: 30 requests/minute per WALLET (not IP). Applied
 *     after `requireAuth` so `req.wallet` is populated. The contract's
 *     daily PvE limit caps wins, but we still want to bound /api/pve/start
 *     calls to keep the matches table from being spammed with abandoned
 *     `in_progress` rows.
 *
 * All three return 429 with `{ error: "rate_limited" }` and the standard
 * `RateLimit-*` response headers. Skips entirely when `RATE_LIMITS=off`
 * — useful for `npm test` and for ops to flip off the limits in an
 * incident.
 */
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request } from "express";

const ONE_MINUTE_MS = 60_000;

function isRateLimitsDisabled(): boolean {
  return (process.env.RATE_LIMITS ?? "").trim().toLowerCase() === "off";
}

/**
 * Build a rate limiter with sensible defaults.
 *
 * @param windowMs   Sliding-window length.
 * @param max        Max requests per window per key.
 * @param keyOf      Pluggable key function. Default: client IP via
 *                   `req.ip` (or x-forwarded-for first hop).
 */
export function buildLimiter(opts: {
  windowMs?: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}): ReturnType<typeof rateLimit> {
  const config: Partial<Options> = {
    windowMs: opts.windowMs ?? ONE_MINUTE_MS,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isRateLimitsDisabled(),
    handler: (_req, res) => {
      res.status(429).json({ error: "rate_limited" });
    },
  };
  if (opts.keyGenerator) {
    config.keyGenerator = opts.keyGenerator;
  }
  return rateLimit(config);
}

export const globalLimiter = buildLimiter({ max: 100 });

export const authLimiter = buildLimiter({ max: 10 });

/**
 * Per-wallet limiter for /api/pve/start. Falls back to IP if `req.wallet`
 * is missing (shouldn't happen — `requireAuth` runs first — but defaults
 * are safer than `undefined`).
 */
export const pveStartLimiter = buildLimiter({
  max: 30,
  keyGenerator: (req) => req.wallet ?? ipKeyGenerator(req.ip ?? "anon"),
});
