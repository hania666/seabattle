/**
 * SIWE (Sign-In With Ethereum, EIP-4361) authentication.
 *
 * Flow:
 *   1. Client POSTs to /auth/nonce with { wallet }. Server stores a
 *      single-use nonce in `auth_nonces` and returns it.
 *   2. Client builds an EIP-4361 message embedding that nonce, prompts
 *      the AGW to sign it (no gas), and POSTs the message + signature
 *      to /auth/verify.
 *   3. Server parses the message, validates domain/nonce/expiry,
 *      verifies the signature against `wallet`, marks the nonce used,
 *      upserts the user, and mints a JWT (HS256) the client uses for
 *      subsequent mutations.
 *
 * Security notes:
 *   - Nonces live 5 minutes (DB default), are single-use, and bound to
 *     the wallet that requested them. We refuse re-use.
 *   - Signatures are verified with viem's `verifyMessage`, which handles
 *     both EOA and EIP-1271 contract wallets (AGW is a smart account, so
 *     we MUST use a verifier that understands EIP-1271).
 *   - JWTs are short-lived (24h) and signed with `JWT_SECRET`. If the
 *     secret rotates, all sessions invalidate.
 */
import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { createPublicClient, http as viemHttp, type PublicClient } from "viem";
import {
  getOrCreateUser,
  isBanned,
  normaliseWallet,
  query,
  recordAudit,
} from "./db";
import { linkIpToWallet, wouldExceedSybilCap } from "./sybil";
import { setSentryWallet } from "./sentry";

declare module "express-serve-static-core" {
  interface Request {
    wallet?: string;
  }
}

const JWT_TTL_SECONDS = 24 * 60 * 60;
const NONCE_BYTES = 16;

export interface AuthEnv {
  jwtSecret: string;
  /** The exact `domain` clients must sign (e.g. `seabattle.xyz`). */
  expectedDomain: string;
  /** The chain id we accept. SIWE messages on other chains are rejected. */
  expectedChainId: number;
  /** RPC URL for EIP-1271 contract-wallet verification. */
  rpcUrl: string;
}

export function loadAuthEnv(): AuthEnv | null {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const expectedDomain = process.env.AUTH_DOMAIN?.trim();
  const rpcUrl = process.env.AUTH_RPC_URL?.trim();
  if (!jwtSecret || !expectedDomain || !rpcUrl) return null;
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return {
    jwtSecret,
    expectedDomain,
    expectedChainId: Number(
      process.env.AUTH_CHAIN_ID ?? process.env.CHAIN_ID ?? 11124,
    ),
    rpcUrl,
  };
}

let publicClient: PublicClient | null = null;
function getPublicClient(rpcUrl: string): PublicClient {
  if (publicClient) return publicClient;
  publicClient = createPublicClient({ transport: viemHttp(rpcUrl) });
  return publicClient;
}

/**
 * Cryptographically random alphanumeric nonce. SIWE requires at least 8
 * alphanumeric characters; we use 32 hex chars (128 bits) which exceeds
 * EIP-4361 entropy requirements and is URL-safe.
 */
export function generateNonce(): string {
  return randomBytes(NONCE_BYTES).toString("hex");
}

export async function issueNonce(rawWallet: string, ip: string | null): Promise<string> {
  const wallet = normaliseWallet(rawWallet);
  const nonce = generateNonce();
  await query(
    `INSERT INTO auth_nonces (nonce, wallet, ip) VALUES ($1, $2, $3)`,
    [nonce, wallet, ip],
  );
  return nonce;
}

export interface VerifyResult {
  token: string;
  wallet: string;
  expiresAt: number;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_message"
      | "invalid_signature"
      | "domain_mismatch"
      | "chain_mismatch"
      | "nonce_unknown"
      | "nonce_used"
      | "nonce_expired"
      | "wallet_mismatch"
      | "banned"
      | "sybil_cap_exceeded"
      | "expired",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Verify an EIP-4361 SIWE message + signature, mark the nonce used, and
 * mint a JWT. Throws `AuthError` on any validation failure.
 */
export async function verifyAndIssueJwt(
  rawMessage: string,
  signature: string,
  env: AuthEnv,
  ip: string | null,
): Promise<VerifyResult> {
  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(rawMessage);
  } catch {
    throw new AuthError("malformed SIWE message", "invalid_message");
  }
  if (parsed.domain !== env.expectedDomain) {
    throw new AuthError(
      `domain mismatch: expected ${env.expectedDomain}, got ${parsed.domain}`,
      "domain_mismatch",
    );
  }
  if (parsed.chainId !== env.expectedChainId) {
    throw new AuthError(
      `chain mismatch: expected ${env.expectedChainId}, got ${parsed.chainId}`,
      "chain_mismatch",
    );
  }
  const wallet = normaliseWallet(parsed.address);

  // Atomically claim the nonce: either we mark it used here, or someone
  // else already has and we refuse the request.
  const claim = await query<{ wallet: string; expires_at: Date }>(
    `UPDATE auth_nonces
     SET used_at = now()
     WHERE nonce = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING wallet, expires_at`,
    [parsed.nonce],
  );
  if (claim.length === 0) {
    const existing = await query<{ used_at: Date | null; expires_at: Date }>(
      `SELECT used_at, expires_at FROM auth_nonces WHERE nonce = $1`,
      [parsed.nonce],
    );
    if (existing.length === 0) {
      throw new AuthError("unknown nonce", "nonce_unknown");
    }
    if (existing[0].used_at != null) {
      throw new AuthError("nonce already used", "nonce_used");
    }
    throw new AuthError("nonce expired", "nonce_expired");
  }
  if (normaliseWallet(claim[0].wallet) !== wallet) {
    throw new AuthError("nonce wallet mismatch", "wallet_mismatch");
  }

  if (parsed.expirationTime) {
    const exp = Date.parse(parsed.expirationTime);
    if (Number.isFinite(exp) && exp < Date.now()) {
      throw new AuthError("SIWE message expired", "expired");
    }
  }

  const client = getPublicClient(env.rpcUrl);
  const ok = await client.verifyMessage({
    address: wallet as `0x${string}`,
    message: parsed.prepareMessage(),
    signature: signature as `0x${string}`,
  });
  if (!ok) {
    await recordAudit({
      wallet,
      action: "siwe.verify.failed",
      payload: { domain: parsed.domain, nonce: parsed.nonce },
      ip,
      severity: "warn",
    });
    throw new AuthError("signature verification failed", "invalid_signature");
  }

  if (await isBanned(wallet)) {
    throw new AuthError("wallet is banned", "banned");
  }

  // Sybil cap: refuse new sign-ins from an IP that has already linked too
  // many distinct wallets in the last 24h. Genuine returning wallets
  // (already linked to this IP) are exempt.
  if (await wouldExceedSybilCap(ip, wallet)) {
    await recordAudit({
      wallet,
      action: "siwe.sybil.blocked",
      payload: { ip },
      ip,
      severity: "warn",
    });
    throw new AuthError("too many wallets from this ip", "sybil_cap_exceeded");
  }

  await getOrCreateUser(wallet);
  await linkIpToWallet(ip, wallet);
  await recordAudit({
    wallet,
    action: "siwe.verify.ok",
    payload: { domain: parsed.domain },
    ip,
    severity: "info",
  });

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + JWT_TTL_SECONDS;
  const token = signJwt({ sub: wallet, iat: now, exp: expiresAt }, env.jwtSecret);
  return { token, wallet, expiresAt: expiresAt * 1000 };
}

interface AppJwtPayload extends JwtPayload {
  sub: string;
}

function signJwt(payload: AppJwtPayload, secret: string, opts: SignOptions = {}): string {
  return jwt.sign(payload, secret, { algorithm: "HS256", ...opts });
}

export function verifyJwt(token: string, secret: string): AppJwtPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new AuthError("malformed token", "invalid_message");
  }
  return decoded as AppJwtPayload;
}

/**
 * Express middleware: requires a valid `Authorization: Bearer <jwt>` header.
 * Attaches the wallet (lower-case) to `req.wallet` on success.
 */
export function requireAuth(env: AuthEnv): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m) {
      res.status(401).json({ error: "missing bearer token" });
      return;
    }
    try {
      const claims = verifyJwt(m[1], env.jwtSecret);
      req.wallet = normaliseWallet(claims.sub);
      // Tag this request's Sentry isolation scope with the wallet so any
      // error captured downstream gets the wallet attached automatically.
      // Per-request scope isolation is created by the `withIsolationScope`
      // middleware in `index.ts` (we don't rely on Sentry's httpIntegration
      // since `Sentry.init` runs with `integrations: []`).
      setSentryWallet(req.wallet);
      next();
    } catch {
      res.status(401).json({ error: "invalid or expired token" });
    }
  };
}
