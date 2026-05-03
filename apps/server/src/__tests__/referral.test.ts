import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveReferral,
  REFERRAL_DAILY_CAP,
  _parseReferralDailyCap,
  type ReferralDeps,
} from "../db";

// Inject query + recordAudit fakes directly via the second arg of saveReferral.
// Cleaner than module-level mocking — module-level vi.mock can't intercept
// intra-module calls in db.ts where saveReferral references query/recordAudit
// from its own lexical scope.

const REFEREE = "0x1111111111111111111111111111111111111111";
const REFERRER = "0x2222222222222222222222222222222222222222";

let queryMock: ReturnType<typeof vi.fn>;
let recordAuditMock: ReturnType<typeof vi.fn>;
let deps: ReferralDeps;

beforeEach(() => {
  queryMock = vi.fn();
  recordAuditMock = vi.fn().mockResolvedValue(undefined);
  deps = {
    query: queryMock as unknown as ReferralDeps["query"],
    recordAudit: recordAuditMock as unknown as ReferralDeps["recordAudit"],
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseReferralDailyCap (env validation at load-time)", () => {
  it("defaults to 20 when env is unset or empty", () => {
    expect(_parseReferralDailyCap(undefined)).toBe(20);
    expect(_parseReferralDailyCap("")).toBe(20);
  });

  it("parses valid non-negative integers", () => {
    expect(_parseReferralDailyCap("0")).toBe(0);
    expect(_parseReferralDailyCap("5")).toBe(5);
    expect(_parseReferralDailyCap("9999")).toBe(9999);
  });

  it.each([
    "abc",
    "5abc",
    "NaN",
    "-1",
    "-100",
    "1.5",
    "Infinity",
    "1e308000", // overflow → Infinity
  ])("rejects %p (would otherwise silently disable cap via NaN/negative)", (raw) => {
    expect(() => _parseReferralDailyCap(raw)).toThrow(/invalid REFERRAL_DAILY_CAP/);
  });
});

describe("saveReferral", () => {
  it("rejects empty ref without auditing (organic users have no ref)", async () => {
    const result = await saveReferral({ referrer: null, referee: REFEREE }, deps);
    expect(result).toEqual({ ok: false, reason: "invalid_format" });
    expect(recordAuditMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed ref (audit logs warn)", async () => {
    const result = await saveReferral(
      { referrer: "not-an-address", referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_format" });
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_rejected",
        severity: "warn",
        payload: expect.objectContaining({ reason: "invalid_format" }),
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects self-referral", async () => {
    const result = await saveReferral(
      { referrer: REFEREE, referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "self_referral" });
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_rejected",
        payload: expect.objectContaining({ reason: "self_referral" }),
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects unknown referrer (FK target missing) and audits", async () => {
    queryMock.mockResolvedValueOnce([]); // SELECT users WHERE wallet = ref → empty
    const result = await saveReferral(
      { referrer: REFERRER, referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "unknown_referrer" });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_rejected",
        payload: expect.objectContaining({ reason: "unknown_referrer" }),
      }),
    );
  });

  it("enforces sybil cap and audits (uses payload.recent + cap)", async () => {
    queryMock
      .mockResolvedValueOnce([{ wallet: REFERRER }]) // referrer exists
      .mockResolvedValueOnce([{ count: String(REFERRAL_DAILY_CAP) }]); // already at cap

    const result = await saveReferral(
      { referrer: REFERRER, referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "sybil_cap_exceeded" });
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_rejected",
        payload: expect.objectContaining({
          reason: "sybil_cap_exceeded",
          recent: REFERRAL_DAILY_CAP,
          cap: REFERRAL_DAILY_CAP,
        }),
      }),
    );
  });

  it("inserts and audits success when all checks pass", async () => {
    queryMock
      .mockResolvedValueOnce([{ wallet: REFERRER }])
      .mockResolvedValueOnce([{ count: "3" }])
      .mockResolvedValueOnce([{ referee: REFEREE }]);

    const result = await saveReferral(
      { referrer: REFERRER, referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: true });
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_recorded",
        severity: "info",
        payload: expect.objectContaining({ ref: REFERRER }),
      }),
    );
  });

  it("treats duplicate referee as info-level rejection (idempotent re-sign-in)", async () => {
    queryMock
      .mockResolvedValueOnce([{ wallet: REFERRER }])
      .mockResolvedValueOnce([{ count: "1" }])
      .mockResolvedValueOnce([]); // INSERT … ON CONFLICT DO NOTHING → no rows

    const result = await saveReferral(
      { referrer: REFERRER, referee: REFEREE },
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "duplicate_referee" });
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "referral_rejected",
        severity: "info",
        payload: expect.objectContaining({ reason: "duplicate_referee" }),
      }),
    );
  });

  it("normalises mixed-case input (referrer + referee both lowercased)", async () => {
    queryMock
      .mockResolvedValueOnce([{ wallet: REFERRER }])
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([{ referee: REFEREE }]);

    await saveReferral(
      { referrer: REFERRER.toUpperCase(), referee: REFEREE.toUpperCase() },
      deps,
    );
    const insertCall = queryMock.mock.calls[2];
    expect(insertCall![1]).toEqual([REFERRER, REFEREE]);
  });

  it("forwards ip + userAgent into every audit event", async () => {
    queryMock.mockResolvedValueOnce([]); // unknown referrer path
    await saveReferral(
      {
        referrer: REFERRER,
        referee: REFEREE,
        ip: "203.0.113.7",
        userAgent: "test-agent/1.0",
      },
      deps,
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "203.0.113.7",
        userAgent: "test-agent/1.0",
      }),
    );
  });
});
