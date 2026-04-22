import type { Coord } from "../game/types";

/**
 * Client-side PvP flow state machine. Kept pure so it can be unit-tested.
 * The actual React/wagmi/socket side-effects live in PvpScreen.
 */

export type Mode = "host" | "join";

export type Stage =
  | { name: "select" }
  | { name: "txCreate"; stakeId: string; txHash?: `0x${string}` }
  | { name: "queued"; stakeId: string; matchId?: `0x${string}` }
  | { name: "txJoin"; stakeId: string; matchId: `0x${string}`; you: "A" | "B"; opponent: `0x${string}`; txHash?: `0x${string}` }
  | { name: "placement"; matchId: `0x${string}`; you: "A" | "B"; opponent: `0x${string}` }
  | { name: "waitingOpponentPlacement"; matchId: `0x${string}`; you: "A" | "B"; opponent: `0x${string}` }
  | { name: "playing"; matchId: `0x${string}`; you: "A" | "B"; opponent: `0x${string}`; turn: `0x${string}`; log: LogEntry[]; ownShots: ShotRecord[]; opponentShots: ShotRecord[] }
  | { name: "ended"; matchId: `0x${string}`; you: "A" | "B"; winner: `0x${string}`; opponent: `0x${string}`; signature: `0x${string}` | null; lobbyAddress: `0x${string}` | null }
  | { name: "claimed"; matchId: `0x${string}` }
  | { name: "aborted"; reason: string };

export interface ShotRecord {
  coord: Coord;
  outcome: "miss" | "hit" | "sunk";
  sunkShipCells?: Coord[];
}

export interface LogEntry {
  by: `0x${string}`;
  coord: Coord;
  outcome: "miss" | "hit" | "sunk";
}

export type Action =
  | { type: "select_mode"; mode: Mode; stakeId: string }
  | { type: "tx_create_sent"; txHash: `0x${string}` }
  | { type: "tx_create_confirmed"; matchId: `0x${string}` }
  | { type: "queued" }
  | { type: "match_ready"; matchId: `0x${string}`; you: "A" | "B"; opponent: `0x${string}` }
  | { type: "tx_join_sent"; txHash: `0x${string}` }
  | { type: "tx_join_confirmed" }
  | { type: "fleet_submitted" }
  | { type: "match_started"; firstTurn: `0x${string}` }
  | { type: "shot"; by: `0x${string}`; coord: Coord; outcome: "miss" | "hit" | "sunk"; sunkShipCells?: Coord[]; ownAddress: `0x${string}` }
  | { type: "match_ended"; winner: `0x${string}`; signature: `0x${string}` | null; lobbyAddress: `0x${string}` | null }
  | { type: "claim_confirmed" }
  | { type: "abort"; reason: string };

export const initialStage: Stage = { name: "select" };

export function reduce(state: Stage, action: Action): Stage {
  switch (action.type) {
    case "select_mode":
      return action.mode === "host"
        ? { name: "txCreate", stakeId: action.stakeId }
        : { name: "queued", stakeId: action.stakeId };
    case "tx_create_sent":
      if (state.name !== "txCreate") return state;
      return { ...state, txHash: action.txHash };
    case "tx_create_confirmed":
      if (state.name !== "txCreate") return state;
      return { name: "queued", stakeId: state.stakeId, matchId: action.matchId };
    case "queued":
      return state;
    case "match_ready": {
      if (state.name === "queued") {
        // Host: already has matchId → go straight to placement (opponent is the joiner).
        if (state.matchId) {
          return {
            name: "placement",
            matchId: action.matchId,
            you: action.you,
            opponent: action.opponent,
          };
        }
        // Joiner: must call joinLobby on-chain first.
        return {
          name: "txJoin",
          stakeId: state.stakeId,
          matchId: action.matchId,
          you: action.you,
          opponent: action.opponent,
        };
      }
      return state;
    }
    case "tx_join_sent":
      if (state.name !== "txJoin") return state;
      return { ...state, txHash: action.txHash };
    case "tx_join_confirmed":
      if (state.name !== "txJoin") return state;
      return {
        name: "placement",
        matchId: state.matchId,
        you: state.you,
        opponent: state.opponent,
      };
    case "fleet_submitted":
      if (state.name !== "placement") return state;
      return {
        name: "waitingOpponentPlacement",
        matchId: state.matchId,
        you: state.you,
        opponent: state.opponent,
      };
    case "match_started":
      if (state.name !== "waitingOpponentPlacement" && state.name !== "placement") return state;
      return {
        name: "playing",
        matchId: state.matchId,
        you: state.you,
        opponent: state.opponent,
        turn: action.firstTurn,
        log: [],
        ownShots: [],
        opponentShots: [],
      };
    case "shot": {
      if (state.name !== "playing") return state;
      const log = [...state.log, { by: action.by, coord: action.coord, outcome: action.outcome }];
      const record: ShotRecord = {
        coord: action.coord,
        outcome: action.outcome,
        sunkShipCells: action.sunkShipCells,
      };
      const iShot = action.by.toLowerCase() === action.ownAddress.toLowerCase();
      const next: Stage = {
        ...state,
        log,
        ownShots: iShot ? [...state.ownShots, record] : state.ownShots,
        opponentShots: iShot ? state.opponentShots : [...state.opponentShots, record],
        // Shooter keeps turn on hit/sunk, hands it over on miss.
        turn: action.outcome === "miss" ? (iShot ? state.opponent : action.ownAddress) : action.by,
      };
      return next;
    }
    case "match_ended":
      if (state.name !== "playing") return state;
      return {
        name: "ended",
        matchId: state.matchId,
        you: state.you,
        winner: action.winner,
        opponent: state.opponent,
        signature: action.signature,
        lobbyAddress: action.lobbyAddress,
      };
    case "claim_confirmed":
      if (state.name !== "ended") return state;
      return { name: "claimed", matchId: state.matchId };
    case "abort":
      return { name: "aborted", reason: action.reason };
  }
}
