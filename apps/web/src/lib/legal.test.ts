import { describe, it, expect, beforeEach } from "vitest";
import {
  acceptConsent,
  getConsent,
  hasConsent,
  revokeConsent,
  CURRENT_CONSENT_VERSION,
} from "./legal";

describe("legal consent", () => {
  beforeEach(() => {
    revokeConsent();
  });

  it("starts without consent", () => {
    expect(hasConsent()).toBe(false);
    expect(getConsent()).toBeNull();
  });

  it("records consent after accept", () => {
    acceptConsent();
    expect(hasConsent()).toBe(true);
    const record = getConsent();
    expect(record).toMatchObject({
      version: CURRENT_CONSENT_VERSION,
      age18: true,
      tos: true,
      privacy: true,
    });
    expect(record?.acceptedAt).toBeGreaterThan(0);
  });

  it("revoke clears consent", () => {
    acceptConsent();
    revokeConsent();
    expect(hasConsent()).toBe(false);
  });
});
