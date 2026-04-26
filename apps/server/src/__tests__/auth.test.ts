/**
 * Unit tests for the SIWE auth helpers. We avoid the Postgres / RPC paths
 * (those need integration coverage) and focus on:
 *   - nonce shape (entropy, alphanumeric, length)
 *   - JWT round-trip and tamper detection
 *   - requireAuth middleware behaviour (401 on missing/invalid tokens,
 *     attaches wallet on success)
 */
import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateNonce,
  requireAuth,
  verifyJwt,
  type AuthEnv,
} from "../auth";

const env: AuthEnv = {
  jwtSecret: "x".repeat(64),
  expectedDomain: "seabattle.test",
  expectedChainId: 11124,
  rpcUrl: "http://127.0.0.1:9999",
};

const wallet = "0x" + "a".repeat(40);

function mockReq(headers: Record<string, string> = {}): any {
  return { header: (n: string) => headers[n.toLowerCase()] };
}

function mockRes(): { status: any; json: any; statusCode?: number; body?: unknown } {
  const out: any = {};
  out.status = (s: number) => {
    out.statusCode = s;
    return out;
  };
  out.json = (b: unknown) => {
    out.body = b;
    return out;
  };
  return out;
}

describe("generateNonce", () => {
  it("returns 32 hex chars (128 bits of entropy)", () => {
    const n = generateNonce();
    expect(n).toMatch(/^[0-9a-f]{32}$/);
  });

  it("never collides across 100 draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateNonce());
    expect(seen.size).toBe(100);
  });
});

describe("verifyJwt", () => {
  it("round-trips a valid token", () => {
    const tok = jwt.sign({ sub: wallet }, env.jwtSecret, { algorithm: "HS256" });
    const decoded = verifyJwt(tok, env.jwtSecret);
    expect(decoded.sub).toBe(wallet);
  });

  it("rejects tokens signed with a different secret", () => {
    const tok = jwt.sign({ sub: wallet }, "other-secret-".repeat(4), {
      algorithm: "HS256",
    });
    expect(() => verifyJwt(tok, env.jwtSecret)).toThrow();
  });

  it("rejects tokens past their `exp` claim", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const tok = jwt.sign({ sub: wallet, exp: past }, env.jwtSecret, {
      algorithm: "HS256",
    });
    expect(() => verifyJwt(tok, env.jwtSecret)).toThrow();
  });

  it("rejects unsigned/`alg:none` tokens", () => {
    // jsonwebtoken refuses to use alg:none with a secret, but a manually
    // crafted alg:none token must still be rejected.
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const payload = Buffer.from(JSON.stringify({ sub: wallet })).toString("base64url");
    const tampered = `${header}.${payload}.`;
    expect(() => verifyJwt(tampered, env.jwtSecret)).toThrow();
  });
});

describe("requireAuth", () => {
  it("rejects requests with no Authorization header", () => {
    const req = mockReq({});
    const res = mockRes();
    let nextCalled = false;
    requireAuth(env)(req, res as any, () => {
      nextCalled = true;
    });
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it("rejects malformed Authorization headers", () => {
    const req = mockReq({ authorization: "Token deadbeef" });
    const res = mockRes();
    requireAuth(env)(req, res as any, () => {
      throw new Error("next should not be called");
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects tokens signed with a different secret", () => {
    const tok = jwt.sign({ sub: wallet }, "another-secret-".repeat(3), {
      algorithm: "HS256",
    });
    const req = mockReq({ authorization: `Bearer ${tok}` });
    const res = mockRes();
    requireAuth(env)(req, res as any, () => {
      throw new Error("next should not be called");
    });
    expect(res.statusCode).toBe(401);
  });

  it("attaches wallet (lower-case) on a valid token", () => {
    const upper = "0x" + "A".repeat(40);
    const tok = jwt.sign({ sub: upper }, env.jwtSecret, { algorithm: "HS256" });
    const req: any = mockReq({ authorization: `Bearer ${tok}` });
    const res = mockRes();
    let called = false;
    requireAuth(env)(req, res as any, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(req.wallet).toBe("0x" + "a".repeat(40));
  });
});
