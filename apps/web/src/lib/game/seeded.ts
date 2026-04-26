/**
 * Deterministic 32-bit PRNG, seeded from a hex string. Mirrors the
 * server's `seededRandom` byte-for-byte (apps/server/src/game/fleet.ts) so
 * the bot fleet placed on the client from `seed` is the same one the
 * server re-derives during `/api/pve/finish`. Splitmix32 mixer — fast,
 * dependency-free, gameplay-determinism only (NOT cryptographic).
 *
 * Usage:
 *   const random = seededRandom(seedHex);
 *   const board = randomFleet(random); // identical placement on server.
 */
export function seededRandom(seedHex: string): () => number {
  const cleaned = seedHex.startsWith("0x") ? seedHex.slice(2) : seedHex;
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length === 0) {
    throw new Error("invalid seed hex");
  }
  let state = 0;
  for (let i = 0; i < cleaned.length; i += 8) {
    const chunk = cleaned.slice(i, i + 8).padEnd(8, "0");
    state = (state ^ parseInt(chunk, 16)) >>> 0;
  }
  if (state === 0) state = 1;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 0x100000000;
  };
}
