/**
 * Tests for client-side SIWE helpers. We don't mock `fetch` here — the network
 * calls (`requestNonce`, `verifySignature`) are thin wrappers that are easier
 * to cover via integration. Focus is on:
 *   - SIWE message format (round-trips through `siwe`'s parser elsewhere)
 *   - sessionStorage round-trip + expiry handling
 *   - `tokenFor` wallet binding
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSiweMessage,
  clearSession,
  getSession,
  peekSession,
  setSession,
  tokenFor,
} from "./auth";

const wallet = "0x" + "a".repeat(40);

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

describe("buildSiweMessage", () => {
  it("emits canonical EIP-4361 lines in order", () => {
    const msg = buildSiweMessage({
      domain: "seabattle.test",
      address: wallet as `0x${string}`,
      statement: "Sign in to SeaBattle.",
      uri: "https://seabattle.test",
      chainId: 11124,
      nonce: "deadbeef",
      issuedAt: Date.UTC(2024, 0, 1, 0, 0, 0),
    });
    const lines = msg.split("\n");
    expect(lines[0]).toBe(
      "seabattle.test wants you to sign in with your Ethereum account:",
    );
    expect(lines[1]).toBe(wallet);
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("Sign in to SeaBattle.");
    expect(lines[5]).toBe("URI: https://seabattle.test");
    expect(lines[6]).toBe("Version: 1");
    expect(lines[7]).toBe("Chain ID: 11124");
    expect(lines[8]).toBe("Nonce: deadbeef");
    expect(lines[9]).toBe("Issued At: 2024-01-01T00:00:00.000Z");
  });

  it("appends Expiration Time when supplied", () => {
    const msg = buildSiweMessage({
      domain: "seabattle.test",
      address: wallet as `0x${string}`,
      statement: "Sign in to SeaBattle.",
      uri: "https://seabattle.test",
      chainId: 11124,
      nonce: "n",
      issuedAt: Date.UTC(2024, 0, 1),
      expirationTime: Date.UTC(2024, 0, 1, 0, 5, 0),
    });
    expect(msg).toContain("Expiration Time: 2024-01-01T00:05:00.000Z");
  });
});

describe("session storage", () => {
  it("round-trips a fresh session", () => {
    const future = Date.now() + 60_000;
    setSession({ token: "abc", wallet, expiresAt: future });
    const out = getSession();
    expect(out).toEqual({ token: "abc", wallet, expiresAt: future });
  });

  it("returns null for expired sessions and clears them", () => {
    const past = Date.now() - 1;
    setSession({ token: "stale", wallet, expiresAt: past });
    expect(getSession()).toBeNull();
    expect(sessionStorage.getItem("seabattle:siwe-session-v1")).toBeNull();
  });

  it("returns null when storage is empty", () => {
    expect(getSession()).toBeNull();
  });

  it("ignores corrupted entries instead of throwing", () => {
    sessionStorage.setItem("seabattle:siwe-session-v1", "not-json");
    expect(getSession()).toBeNull();
  });

  it("clearSession wipes the entry", () => {
    setSession({ token: "abc", wallet, expiresAt: Date.now() + 1000 });
    clearSession();
    expect(getSession()).toBeNull();
  });

  it("peekSession returns null for expired but does NOT mutate storage", () => {
    setSession({ token: "stale", wallet, expiresAt: Date.now() - 1 });
    expect(peekSession()).toBeNull();
    // Still present — peekSession is render-safe and never clears.
    expect(sessionStorage.getItem("seabattle:siwe-session-v1")).not.toBeNull();
  });

  it("peekSession does not dispatch auth:updated on expired reads", () => {
    setSession({ token: "stale", wallet, expiresAt: Date.now() - 1 });
    let dispatched = 0;
    const listener = () => {
      dispatched++;
    };
    window.addEventListener("auth:updated", listener);
    try {
      peekSession();
      peekSession();
      expect(dispatched).toBe(0);
    } finally {
      window.removeEventListener("auth:updated", listener);
    }
  });
});

describe("tokenFor", () => {
  it("returns the token only for the bound wallet", () => {
    setSession({ token: "abc", wallet, expiresAt: Date.now() + 60_000 });
    expect(tokenFor(wallet)).toBe("abc");
    expect(tokenFor(wallet.toUpperCase())).toBe("abc");
    expect(tokenFor("0x" + "b".repeat(40))).toBeNull();
    expect(tokenFor(undefined)).toBeNull();
  });

  it("returns null when the session has expired", () => {
    setSession({ token: "abc", wallet, expiresAt: Date.now() - 1 });
    expect(tokenFor(wallet)).toBeNull();
  });
});
