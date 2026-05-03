import { describe, expect, it } from "vitest";
import { Matchmaker, inMemoryPairCapStore } from "../matchmaking";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const C = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

// Each test gets its own Matchmaker with a fresh in-memory store so cap
// state doesn't bleed between cases.
function freshMatchmaker(): Matchmaker {
  return new Matchmaker(inMemoryPairCapStore());
}

describe("Matchmaker", () => {
  it("first enqueue waits, second pairs", async () => {
    const mm = freshMatchmaker();
    expect(await mm.enqueue({ socketId: "s1", address: A, stake: 100n })).toBeNull();
    const pair = await mm.enqueue({ socketId: "s2", address: B, stake: 100n });
    expect(pair).not.toBeNull();
    expect(pair!.playerA.address).toBe(A);
    expect(pair!.playerB.address).toBe(B);
    expect(pair!.stake).toBe(100n);
    expect(mm.size(100n)).toBe(0);
  });

  it("does not pair the same address with itself", async () => {
    const mm = freshMatchmaker();
    await mm.enqueue({ socketId: "s1", address: A, stake: 100n });
    // Same address on a second socket — should still wait.
    expect(await mm.enqueue({ socketId: "s2", address: A, stake: 100n })).toBeNull();
    expect(mm.size(100n)).toBe(2);
    const pair = await mm.enqueue({ socketId: "s3", address: B, stake: 100n });
    expect(pair).not.toBeNull();
    // The pair should involve address B and one of the A sockets, not two As.
    expect(pair!.playerB.address).toBe(B);
    expect(pair!.playerA.address).toBe(A);
  });

  it("keeps queues separate per stake", async () => {
    const mm = freshMatchmaker();
    await mm.enqueue({ socketId: "s1", address: A, stake: 100n });
    expect(await mm.enqueue({ socketId: "s2", address: B, stake: 200n })).toBeNull();
    expect(mm.size(100n)).toBe(1);
    expect(mm.size(200n)).toBe(1);
  });

  it("prefers the creator's matchId when one is provided", async () => {
    const mm = freshMatchmaker();
    const onchainId = `0x${"de".repeat(32)}` as `0x${string}`;
    await mm.enqueue({ socketId: "s1", address: A, stake: 100n, matchId: onchainId });
    const pair = await mm.enqueue({ socketId: "s2", address: B, stake: 100n });
    expect(pair!.matchId).toBe(onchainId);
  });

  it("remove() drops a socket from its queue", async () => {
    const mm = freshMatchmaker();
    await mm.enqueue({ socketId: "s1", address: A, stake: 100n });
    await mm.enqueue({ socketId: "s2", address: C, stake: 200n });
    mm.remove("s1");
    expect(mm.size(100n)).toBe(0);
    expect(mm.size(200n)).toBe(1);
  });
});
