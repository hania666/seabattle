/**
 * `useAuth` — React hook bundling the SIWE flow + session state.
 *
 * - Reads/writes `sessionStorage` via `lib/auth.ts`.
 * - Re-emits the session on the `auth:updated` window event so any tab
 *   component (Hud, Profile) shows the same state.
 * - `signIn()` requests a nonce, builds an EIP-4361 message, asks wagmi
 *   to sign it (AGW shows the standard signature prompt — no gas), and
 *   POSTs the result to `/auth/verify`. On success the JWT is stored
 *   and the function returns the new session.
 * - `signOut()` only clears the local token; the JWT will still be
 *   accepted by the server until its `exp` (24h). For a true server-side
 *   logout we'd need a deny-list, deferred to a later phase.
 */
import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  authedFetch,
  buildSiweMessage,
  clearSession,
  peekSession,
  requestNonce,
  setSession,
  tokenFor,
  verifySignature,
  type AuthSession,
} from "./auth";
import { syncStatsAfterSignIn } from "./serverStats";

/** `fetch` bound to the connected wallet's JWT, or unauthenticated when none. */
export type AuthedFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface UseAuth {
  session: AuthSession | null;
  /** Token bound to the *currently connected* wallet, or null. */
  token: string | null;
  isSigningIn: boolean;
  /** Last sign-in error message, cleared on a fresh `signIn()` call. */
  error: string | null;
  signIn: () => Promise<AuthSession | null>;
  signOut: () => void;
  /**
   * Wallet-scoped wrapper around `fetch`. Attaches the Bearer header only
   * when the stored session belongs to the currently connected address;
   * otherwise the request goes out unauthenticated.
   */
  authedFetch: AuthedFetch;
}

function readActiveSession(wallet: string | undefined): AuthSession | null {
  // `peekSession` is the side-effect-free reader, safe to call from a
  // React `useState` initialiser or from a render-phase recompute. The
  // imperative cleanup variant (`getSession`) lives in auth.ts and runs
  // only from event handlers / effects.
  const s = peekSession();
  if (!s) return null;
  if (!wallet) return null;
  return s.wallet.toLowerCase() === wallet.toLowerCase() ? s : null;
}

export function useAuth(): UseAuth {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSessionState] = useState<AuthSession | null>(() =>
    readActiveSession(address),
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync component state with sessionStorage. Re-runs whenever the
  // wallet changes or another component dispatches `auth:updated`.
  useEffect(() => {
    function refresh() {
      setSessionState(readActiveSession(address));
    }
    refresh();
    window.addEventListener("auth:updated", refresh);
    return () => window.removeEventListener("auth:updated", refresh);
  }, [address]);

  const signIn = useCallback(async (): Promise<AuthSession | null> => {
    if (!address) return null;
    setError(null);
    setIsSigningIn(true);
    try {
      const nonce = await requestNonce(address);
      const message = buildSiweMessage({
        domain: nonce.domain,
        address: address as `0x${string}`,
        statement: nonce.statement,
        uri: window.location.origin,
        chainId: nonce.chainId,
        nonce: nonce.nonce,
        issuedAt: Date.now(),
        expirationTime: Date.now() + nonce.expiresInSeconds * 1000,
      });
      const signature = await signMessageAsync({ message });
      const verified = await verifySignature(message, signature, getRef() ?? undefined);
      const next: AuthSession = {
        token: verified.token,
        wallet: verified.wallet,
        expiresAt: verified.expiresAt,
      };
      setSession(next);
      setSessionState(next);
      // Reconcile localStorage stats with the server in the background.
      // Failures are silent so the sign-in still counts as successful even
      // if the stats round-trip drops; the next successful call will pick
      // up the same payload via MAX-merge.
      const fetchForWallet: AuthedFetch = (input, init) =>
        authedFetch(verified.wallet, input, init);
      void syncStatsAfterSignIn(verified.wallet, fetchForWallet);
      return next;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sign-in failed";
      setError(msg);
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, [address, signMessageAsync]);

  const signOut = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const boundFetch = useCallback<AuthedFetch>(
    (input, init) => authedFetch(address, input, init),
    [address],
  );

  return {
    session,
    token: tokenFor(address),
    isSigningIn,
    error,
    signIn,
    signOut,
    authedFetch: boundFetch,
  };
}
