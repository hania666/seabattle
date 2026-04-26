/**
 * Unit tests for the sybil cap helpers (Phase 8.9).
 *
 * The persistence layer (`query`) is mocked so we exercise the SQL
 * shape and threshold logic in isolation. Integration coverage (real
 * Postgres) lives behind the deploy-time smoke checks.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  query: vi.fn(),
}));

import {
  countDistinctWalletsForIp,
  linkIpToWallet,
  SYBIL_MAX_WALLETS_PER_IP_24H,
  SYBIL_WINDOW_HOURS,
  wouldExceedSybilCap,
} from "../sybil";
import { query } from "../db";

const wallet = "0x" + "a".repeat(40);
const ip = "1.2.3.4";

afterEach(() => {
  vi.mocked(query).mockReset();
});

describe("linkIpToWallet", () => {
  it("upserts the (ip, wallet) pair with hit_count bump on conflict", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await linkIpToWallet(ip, wallet);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, args] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain("INSERT INTO ip_wallet_link");
    expect(sql).toContain("ON CONFLICT (ip, wallet) DO UPDATE");
    expect(sql).toContain("hit_count = ip_wallet_link.hit_count + 1");
    expect(args).toEqual([ip, wallet]);
  });

  it("is a no-op when ip is null (proxy stripped the header)", async () => {
    await linkIpToWallet(null, wallet);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("countDistinctWalletsForIp", () => {
  it("returns the count from the SQL response, parsed as a number", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ wallet_count: "3" }]);
    const n = await countDistinctWalletsForIp(ip);
    expect(n).toBe(3);
    const [, args] = vi.mocked(query).mock.calls[0]!;
    expect(args).toEqual([ip, String(SYBIL_WINDOW_HOURS)]);
  });

  it("returns 0 when no rows match", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    expect(await countDistinctWalletsForIp(ip)).toBe(0);
  });

  it("returns 0 (no DB roundtrip) when ip is null", async () => {
    expect(await countDistinctWalletsForIp(null)).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("wouldExceedSybilCap", () => {
  it("rejects a new wallet when the IP is already at the cap", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { wallet_count: String(SYBIL_MAX_WALLETS_PER_IP_24H), has_self: false },
    ]);
    expect(await wouldExceedSybilCap(ip, wallet)).toBe(true);
  });

  it("permits a new wallet when the IP is just below the cap", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { wallet_count: String(SYBIL_MAX_WALLETS_PER_IP_24H - 1), has_self: false },
    ]);
    expect(await wouldExceedSybilCap(ip, wallet)).toBe(false);
  });

  it("ignores the cap when the wallet is already linked to this IP", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { wallet_count: String(SYBIL_MAX_WALLETS_PER_IP_24H + 5), has_self: true },
    ]);
    expect(await wouldExceedSybilCap(ip, wallet)).toBe(false);
  });

  it("permits requests with no IP (proxies that strip the header)", async () => {
    expect(await wouldExceedSybilCap(null, wallet)).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
