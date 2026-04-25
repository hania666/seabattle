import { describe, it, expect } from "vitest";
import { evaluateBlock } from "./geo";

describe("evaluateBlock", () => {
  it("passes a regular country", () => {
    expect(
      evaluateBlock({ country: "DE", region: null, status: "ok" }),
    ).toBeNull();
  });

  it("passes US non-blocked state", () => {
    expect(
      evaluateBlock({ country: "US", region: "CA", status: "ok" }),
    ).toBeNull();
  });

  it("blocks sanctioned country", () => {
    const result = evaluateBlock({
      country: "IR",
      region: null,
      status: "ok",
    });
    expect(result?.reason).toBe("sanctioned");
    expect(result?.country).toBe("IR");
  });

  it("blocks prohibited country", () => {
    expect(
      evaluateBlock({ country: "AE", region: null, status: "ok" })?.reason,
    ).toBe("prohibited_country");
    expect(
      evaluateBlock({ country: "SG", region: null, status: "ok" })?.reason,
    ).toBe("prohibited_country");
    expect(
      evaluateBlock({ country: "CN", region: null, status: "ok" })?.reason,
    ).toBe("prohibited_country");
    expect(
      evaluateBlock({ country: "SA", region: null, status: "ok" })?.reason,
    ).toBe("prohibited_country");
  });

  it("blocks US restricted states", () => {
    const states = ["WA", "AZ", "LA", "MT", "SD", "SC", "TN", "AR", "CT", "DE"];
    for (const state of states) {
      const result = evaluateBlock({
        country: "US",
        region: state,
        status: "ok",
      });
      expect(result?.reason).toBe("prohibited_state");
      expect(result?.region).toBe(state);
    }
  });

  it("fails-open when geo lookup failed", () => {
    expect(
      evaluateBlock({ country: null, region: null, status: "failed" }),
    ).toBeNull();
  });

  it("handles lowercase country codes", () => {
    expect(
      evaluateBlock({ country: "ir", region: null, status: "ok" })?.reason,
    ).toBe("sanctioned");
  });
});
