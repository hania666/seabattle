/**
 * Smoke tests for the rate-limit middleware factory (Phase 8.9).
 *
 * We don't try to exercise the full sliding-window state machine here —
 * that's express-rate-limit's job and they ship their own tests. We
 * just verify that:
 *   - the configured limit fires and returns a 429 with our error shape
 *   - RATE_LIMITS=off makes the limiter a pass-through
 *   - the wallet-keyed limiter actually keys by wallet, not IP
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request, type Response } from "express";
import http from "node:http";
import { buildLimiter } from "../middleware/rateLimit";

async function fetchOnce(
  url: string,
  init?: { headers?: Record<string, string> },
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, init);
  let body: unknown = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function withServer<T>(
  configure: (app: express.Express) => void,
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  // Use the loopback header explicitly so tests don't depend on
  // `trust proxy`. The X-Forwarded-For header is read by express-rate-limit
  // when the keyGenerator falls back to `req.ip`.
  configure(app);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server has no address");
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("buildLimiter", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMITS;
  });
  afterEach(() => {
    delete process.env.RATE_LIMITS;
  });

  it("returns 429 with our error code once the cap is exceeded", async () => {
    const limiter = buildLimiter({ max: 2, windowMs: 60_000 });
    await withServer(
      (app) => {
        app.use(limiter);
        app.get("/", (_req, res) => res.json({ ok: true }));
      },
      async (base) => {
        const a = await fetchOnce(base + "/");
        const b = await fetchOnce(base + "/");
        const c = await fetchOnce(base + "/");
        expect(a.status).toBe(200);
        expect(b.status).toBe(200);
        expect(c.status).toBe(429);
        expect(c.body).toEqual({ error: "rate_limited" });
      },
    );
  });

  it("is a no-op when RATE_LIMITS=off", async () => {
    process.env.RATE_LIMITS = "off";
    const limiter = buildLimiter({ max: 1, windowMs: 60_000 });
    await withServer(
      (app) => {
        app.use(limiter);
        app.get("/", (_req, res) => res.json({ ok: true }));
      },
      async (base) => {
        const a = await fetchOnce(base + "/");
        const b = await fetchOnce(base + "/");
        const c = await fetchOnce(base + "/");
        expect(a.status).toBe(200);
        expect(b.status).toBe(200);
        expect(c.status).toBe(200);
      },
    );
  });

  it("keys by wallet when keyGenerator uses req.wallet", async () => {
    const limiter = buildLimiter({
      max: 1,
      windowMs: 60_000,
      keyGenerator: (req: Request) => req.wallet ?? req.ip ?? "anon",
    });
    await withServer(
      (app) => {
        app.use((req, _res, next) => {
          req.wallet = req.header("x-test-wallet") ?? undefined;
          next();
        });
        app.use(limiter);
        app.get("/", (_req: Request, res: Response) => res.json({ ok: true }));
      },
      async (base) => {
        const a1 = await fetchOnce(base + "/", {
          headers: { "x-test-wallet": "0xaaaa" },
        });
        const a2 = await fetchOnce(base + "/", {
          headers: { "x-test-wallet": "0xaaaa" },
        });
        const b1 = await fetchOnce(base + "/", {
          headers: { "x-test-wallet": "0xbbbb" },
        });
        expect(a1.status).toBe(200);
        expect(a2.status).toBe(429);
        expect(b1.status).toBe(200);
      },
    );
  });
});
