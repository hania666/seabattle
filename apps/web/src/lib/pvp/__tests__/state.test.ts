import { describe, expect, it } from "vitest";
import { initialStage, reduce, type Stage } from "../state";

const MATCH_ID = `0x${"1a".repeat(32)}` as `0x${string}`;
const ME = "0x1111111111111111111111111111111111111111" as const;
const OPP = "0x2222222222222222222222222222222222222222" as const;

describe("pvp reducer", () => {
  it("host flow: select -> txCreate -> queued -> match_ready -> placement", () => {
    let s: Stage = initialStage;
    s = reduce(s, { type: "select_mode", mode: "host", stakeId: "med" });
    expect(s.name).toBe("txCreate");

    s = reduce(s, { type: "tx_create_confirmed", matchId: MATCH_ID });
    expect(s).toMatchObject({ name: "queued", matchId: MATCH_ID, stakeId: "med" });

    s = reduce(s, { type: "match_ready", matchId: MATCH_ID, you: "A", opponent: OPP });
    expect(s).toMatchObject({ name: "placement", you: "A", opponent: OPP, stakeId: "med" });
  });

  it("join flow: select(join) -> queued -> match_ready -> txJoin -> placement", () => {
    let s: Stage = initialStage;
    s = reduce(s, { type: "select_mode", mode: "join", stakeId: "med" });
    expect(s.name).toBe("queued");

    s = reduce(s, { type: "match_ready", matchId: MATCH_ID, you: "B", opponent: OPP });
    expect(s).toMatchObject({ name: "txJoin", you: "B" });

    s = reduce(s, { type: "tx_join_sent", txHash: `0x${"ff".repeat(32)}` });
    expect(s.name).toBe("txJoin");

    s = reduce(s, { type: "tx_join_confirmed" });
    expect(s).toMatchObject({ name: "placement", you: "B", stakeId: "med" });
  });

  it("stakeId is propagated from select all the way to claimed", () => {
    let s: Stage = initialStage;
    s = reduce(s, { type: "select_mode", mode: "host", stakeId: "high" });
    s = reduce(s, { type: "tx_create_confirmed", matchId: MATCH_ID });
    s = reduce(s, { type: "match_ready", matchId: MATCH_ID, you: "A", opponent: OPP });
    s = reduce(s, { type: "fleet_submitted" });
    expect(s).toMatchObject({ name: "waitingOpponentPlacement", stakeId: "high" });
    s = reduce(s, { type: "match_started", firstTurn: ME });
    expect(s).toMatchObject({ name: "playing", stakeId: "high" });
    s = reduce(s, {
      type: "match_ended",
      winner: ME,
      signature: null,
      lobbyAddress: null,
    });
    expect(s).toMatchObject({ name: "ended", stakeId: "high" });
    s = reduce(s, { type: "claim_confirmed" });
    expect(s).toMatchObject({ name: "claimed", stakeId: "high" });
  });

  it("turn handover: miss swaps turn; hit keeps it", () => {
    let s: Stage = {
      name: "playing",
      stakeId: "med",
      matchId: MATCH_ID,
      you: "A",
      opponent: OPP,
      turn: ME,
      log: [],
      ownShots: [],
      opponentShots: [],
    };
    // I fire and miss -> opponent's turn.
    s = reduce(s, { type: "shot", by: ME, coord: [0, 0], outcome: "miss", ownAddress: ME });
    expect(s).toMatchObject({ name: "playing", turn: OPP });
    expect((s as { ownShots: unknown[] }).ownShots).toHaveLength(1);

    // Opponent fires and hits -> keeps turn.
    s = reduce(s, { type: "shot", by: OPP, coord: [5, 5], outcome: "hit", ownAddress: ME });
    expect(s).toMatchObject({ name: "playing", turn: OPP });
    expect((s as { opponentShots: unknown[] }).opponentShots).toHaveLength(1);
  });

  it("match_ended transitions to ended with signature", () => {
    const playing: Stage = {
      name: "playing",
      stakeId: "med",
      matchId: MATCH_ID,
      you: "A",
      opponent: OPP,
      turn: ME,
      log: [],
      ownShots: [],
      opponentShots: [],
    };
    const sig = `0x${"ab".repeat(65)}` as `0x${string}`;
    const s = reduce(playing, {
      type: "match_ended",
      winner: ME,
      signature: sig,
      lobbyAddress: "0x3333333333333333333333333333333333333333",
    });
    expect(s).toMatchObject({ name: "ended", winner: ME, signature: sig });
  });

  it("abort from anywhere", () => {
    const s = reduce({ name: "queued", stakeId: "med" }, { type: "abort", reason: "opponent left" });
    expect(s).toMatchObject({ name: "aborted", reason: "opponent left" });
  });

  it("abort carries forward matchId + stakeId from an on-chain stage for refund UI", () => {
    const playing: Stage = {
      name: "playing",
      stakeId: "high",
      matchId: MATCH_ID,
      you: "A",
      opponent: OPP,
      turn: ME,
      log: [],
      ownShots: [],
      opponentShots: [],
    };
    const s = reduce(playing, { type: "abort", reason: "Opponent disconnected" });
    expect(s).toMatchObject({
      name: "aborted",
      reason: "Opponent disconnected",
      stakeId: "high",
      matchId: MATCH_ID,
    });
  });

  it("abort before any on-chain stage has no matchId", () => {
    const s = reduce(initialStage, { type: "abort", reason: "unexpected" });
    expect(s).toMatchObject({ name: "aborted", reason: "unexpected" });
    expect((s as { matchId?: string }).matchId).toBeUndefined();
  });
});
