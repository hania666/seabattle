import { describe, expect, it } from "vitest";
import { errMessage, shortAddress, shortHash } from "./format";

describe("format helpers", () => {
  it("shortAddress abbreviates long addresses", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
    expect(shortAddress("0x1234")).toBe("0x1234");
    expect(shortAddress(undefined)).toBe("");
  });

  it("shortHash abbreviates long hashes", () => {
    const h = `0x${"ab".repeat(32)}`;
    expect(shortHash(h).length).toBeLessThan(h.length);
    expect(shortHash("")).toBe("");
  });

  it("errMessage prefers shortMessage when present", () => {
    const e = Object.assign(new Error("long"), { shortMessage: "short" });
    expect(errMessage(e)).toBe("short");
    expect(errMessage(new Error("only long"))).toBe("only long");
    expect(errMessage("plain")).toBe("plain");
    expect(errMessage(null)).toBe("Unknown error");
  });
});
