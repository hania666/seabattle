/**
 * Client-side SIWE (Sign-In With Ethereum) helpers.
 *
 * Pairs with `apps/server/src/auth.ts`. Flow:
 *   1. `requestNonce(wallet)` → server returns { nonce, domain, chainId }.
 *   2. `buildSiweMessage(...)` builds the canonical EIP-4361 string the
 *      user must sign (no gas, just personal_sign).
 *   3. Send the signature to `/auth/verify`; server returns a JWT.
 *   4. `setSession()` persists `{ token, wallet, expiresAt }` in
 *      `sessionStorage` so it survives a tab refresh but not a tab close
 *      (auth tied to AGW connection lifetime, not "remember me").
 *   5. `authedFetch(path, init)` adds `Authorization: Bearer <jwt>` to
 *      any subsequent server call. If the token is missing or expired
 *      it sends the request unauthenticated and the server returns 401.
 */
import { SERVER_URL } from "./socket";

const SESSION_KEY = "seabattle:siwe-session-v1";

export interface NonceResponse {
  nonce: string;
  domain: string;
  chainId: number;
  statement: string;
  expiresInSeconds: number;
}

export interface VerifyResponse {
  token: string;
  wallet: string;
  expiresAt: number;
}

export interface AuthSession {
  token: string;
  wallet: string;
  expiresAt: number;
}

export async function requestNonce(wallet: string): Promise<NonceResponse> {
  const res = await fetch(`${SERVER_URL}/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet }),
  });
  if (!res.ok) {
    throw new Error(`nonce request failed: ${res.status}`);
  }
  return (await res.json()) as NonceResponse;
}

export async function verifySignature(
  message: string,
  signature: string,
): Promise<VerifyResponse> {
  const res = await fetch(`${SERVER_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    let err = `verify failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body.error) err = body.error;
    } catch {
      /* response wasn't JSON; keep the status string */
    }
    throw new Error(err);
  }
  return (await res.json()) as VerifyResponse;
}

export interface BuildSiweMessageInput {
  domain: string;
  address: `0x${string}`;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  /** ms since epoch when the message was issued. Defaults to `Date.now()`. */
  issuedAt?: number;
  /** ms since epoch when the message must no longer be accepted. */
  expirationTime?: number;
}

/**
 * Build a canonical EIP-4361 message string. Mirrors what `siwe`'s
 * `SiweMessage.prepareMessage()` produces — we intentionally hand-roll it
 * here so the client doesn't pull in `siwe` (and its ethers peer dep).
 */
export function buildSiweMessage(input: BuildSiweMessageInput): string {
  const issuedAt = new Date(input.issuedAt ?? Date.now()).toISOString();
  const lines = [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    input.address,
    "",
    input.statement,
    "",
    `URI: ${input.uri}`,
    `Version: 1`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${issuedAt}`,
  ];
  if (input.expirationTime != null) {
    lines.push(`Expiration Time: ${new Date(input.expirationTime).toISOString()}`);
  }
  return lines.join("\n");
}

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      typeof parsed.token === "string" &&
      typeof parsed.wallet === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed;
    }
  } catch {
    /* corrupted entry — drop it */
  }
  return null;
}

/**
 * Pure read: returns the live session, or null when missing/expired. Never
 * mutates storage or dispatches events — safe to call during render. Use
 * this from React render paths (`tokenFor`, `readActiveSession`).
 */
export function peekSession(): AuthSession | null {
  const s = readSession();
  if (!s) return null;
  if (s.expiresAt <= Date.now()) return null;
  return s;
}

/**
 * Imperative read with cleanup: returns the live session, and if the stored
 * one is expired, clears it (which dispatches `auth:updated`). Only call
 * from event handlers or effects — never during render.
 */
export function getSession(): AuthSession | null {
  const s = readSession();
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  return s;
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("auth:updated"));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("auth:updated"));
}

/**
 * Returns the JWT only if it belongs to `wallet` (case-insensitive). Used by
 * the React hook so a stale token from a previous AGW connection doesn't get
 * applied to a freshly-connected different wallet.
 */
export function tokenFor(wallet: string | undefined): string | null {
  if (!wallet) return null;
  const s = peekSession();
  if (!s) return null;
  if (s.wallet.toLowerCase() !== wallet.toLowerCase()) return null;
  return s.token;
}

/**
 * Wrap `fetch` with a Bearer header from the wallet-bound session. The header
 * is attached only when the active session matches `wallet` (case-insensitive
 * via `tokenFor`); a stale token from a previous AGW connection is never
 * applied to a freshly-connected different wallet. If `wallet` is undefined
 * or has no token, the request goes out unauthenticated and the server
 * returns 401 — callers handle that the same way they'd handle any other
 * auth failure (re-prompt the SIWE flow).
 */
export async function authedFetch(
  wallet: string | undefined,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  // Cleanup-on-expiry path: this is a runtime call, not render, so the
  // event-dispatching `getSession` is safe and welcome here.
  const session = wallet ? getSession() : null;
  const token =
    session && wallet && session.wallet.toLowerCase() === wallet.toLowerCase()
      ? session.token
      : null;
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
