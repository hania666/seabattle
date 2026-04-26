import { describe, expect, it } from "vitest";
import { stripSslMode, normaliseWallet } from "../db";

describe("stripSslMode", () => {
  it.each([
    ["postgres://x/y?sslmode=require", "postgres://x/y"],
    ["postgres://x/y?foo=bar&sslmode=require&baz=1", "postgres://x/y?foo=bar&baz=1"],
    ["postgres://x/y?foo=bar&sslmode=require", "postgres://x/y?foo=bar"],
    ["postgres://x/y?sslmode=require&foo=bar", "postgres://x/y?foo=bar"],
    ["postgres://x/y", "postgres://x/y"],
    ["postgres://x/y?foo=bar", "postgres://x/y?foo=bar"],
    ["postgres://x/y?sslmode=verify-full&pool=5", "postgres://x/y?pool=5"],
    ["postgres://x/y?SSLMODE=disable", "postgres://x/y"],
  ])("%s -> %s", (input, want) => {
    expect(stripSslMode(input)).toBe(want);
  });
});

describe("normaliseWallet", () => {
  it("lower-cases valid addresses", () => {
    expect(normaliseWallet("0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa")).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });
  it("rejects invalid addresses", () => {
    expect(() => normaliseWallet("0x123")).toThrow(/invalid wallet/);
    expect(() => normaliseWallet("not-an-address")).toThrow(/invalid wallet/);
  });
});
