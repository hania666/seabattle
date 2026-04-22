import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { hashMessage, keccak256, recoverAddress } from "viem";
import { claimHash, resultHash, signClaim, signResult } from "../signer";

const TEST_KEY = "0x".padEnd(66, "1") as `0x${string}`;
const signer = privateKeyToAccount(TEST_KEY);

const lobby = "0x1111111111111111111111111111111111111111" as const;
const botMatch = "0x2222222222222222222222222222222222222222" as const;
const matchId = `0x${"ab".repeat(32)}` as const;
const winner = "0x3333333333333333333333333333333333333333" as const;

describe("signer", () => {
  it("claimHash is stable + 32 bytes", () => {
    const h = claimHash({ chainId: 11124, lobbyAddress: lobby, matchId, winner });
    expect(h).toMatch(/^0x[0-9a-fA-F]{64}$/);
    // Deterministic: same inputs -> same hash.
    const h2 = claimHash({ chainId: 11124, lobbyAddress: lobby, matchId, winner });
    expect(h2).toBe(h);
  });

  it("resultHash is stable + 32 bytes", () => {
    const h = resultHash({ chainId: 11124, botMatchAddress: botMatch, matchId, player: winner, won: true });
    expect(h).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it("resultHash depends on the won flag", () => {
    const t = resultHash({ chainId: 11124, botMatchAddress: botMatch, matchId, player: winner, won: true });
    const f = resultHash({ chainId: 11124, botMatchAddress: botMatch, matchId, player: winner, won: false });
    expect(t).not.toBe(f);
  });

  it("signClaim produces a signature the contract would accept", async () => {
    const sig = await signClaim(signer, { chainId: 11124, lobbyAddress: lobby, matchId, winner });
    expect(sig).toMatch(/^0x[0-9a-fA-F]{130}$/);

    // Recreate the EIP-191 pre-image the contract hashes (hashMessage applies
    // "\x19Ethereum Signed Message:\n32" + raw 32-byte digest).
    const raw = claimHash({ chainId: 11124, lobbyAddress: lobby, matchId, winner });
    expect(keccak256(raw)).toMatch(/^0x/); // sanity that raw is well-formed
    const ethHash = hashMessage({ raw });
    const recovered = await recoverAddress({ hash: ethHash, signature: sig });
    expect(recovered.toLowerCase()).toBe(signer.address.toLowerCase());
  });

  it("signResult produces a signature the contract would accept", async () => {
    const input = { chainId: 11124, botMatchAddress: botMatch, matchId, player: winner, won: true };
    const sig = await signResult(signer, input);
    const raw = resultHash(input);
    const recovered = await recoverAddress({ hash: hashMessage({ raw }), signature: sig });
    expect(recovered.toLowerCase()).toBe(signer.address.toLowerCase());
  });

  it("different chainIds produce different signatures", async () => {
    const a = await signClaim(signer, { chainId: 1, lobbyAddress: lobby, matchId, winner });
    const b = await signClaim(signer, { chainId: 11124, lobbyAddress: lobby, matchId, winner });
    expect(a).not.toBe(b);
  });
});
