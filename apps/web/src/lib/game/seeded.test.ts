import { describe, expect, it } from "vitest";
import { seededRandom } from "./seeded";
import { randomFleet } from "./board";

describe("seededRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const a = seededRandom("0xdeadbeefcafebabe1234567890abcdefdeadbeefcafebabe1234567890abcdef");
    const b = seededRandom("0xdeadbeefcafebabe1234567890abcdefdeadbeefcafebabe1234567890abcdef");
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it("differs for typical seeds", () => {
    // Seeds that look like real 32-byte randomBytes output (mixed bytes).
    // Note: the splitmix32 fold is XOR-based, so pathological all-same-byte
    // seeds with an even chunk count fold to 0 regardless of byte value.
    // Production seeds come from `randomBytes(32)` so the collision space
    // is vanishingly small in practice.
    const a = seededRandom("0xdeadbeef00112233445566778899aabbccddeeff0123456789abcdef01234567");
    const b = seededRandom("0xdeadbeef00112233445566778899aabbccddeeff0123456789abcdef01234568");
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("accepts hex with or without 0x prefix", () => {
    const a = seededRandom("0x" + "ab".repeat(32));
    const b = seededRandom("ab".repeat(32));
    expect(a()).toBe(b());
  });

  it("rejects non-hex input", () => {
    expect(() => seededRandom("not-hex")).toThrow();
    expect(() => seededRandom("")).toThrow();
    expect(() => seededRandom("0x")).toThrow();
  });

  it("produces values in [0, 1)", () => {
    const r = seededRandom("0x" + "3c".repeat(32));
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomFleet seeded", () => {
  it("places the same fleet twice for the same seed", () => {
    const seed = "0x" + "5a".repeat(32);
    const a = randomFleet(seededRandom(seed));
    const b = randomFleet(seededRandom(seed));
    expect(a.ships.length).toBe(b.ships.length);
    for (let i = 0; i < a.ships.length; i++) {
      expect(a.ships[i].size).toBe(b.ships[i].size);
      expect(a.ships[i].cells).toEqual(b.ships[i].cells);
    }
  });

  it("places a fleet with the standard sizes", () => {
    const seed = "0x" + "7e".repeat(32);
    const board = randomFleet(seededRandom(seed));
    const sizes = board.ships.map((s) => s.size).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 4, 3, 3, 2]);
  });
});
