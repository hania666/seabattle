import { io, type Socket } from "socket.io-client";
import type { Coord, ShipKind } from "./game/types";

export const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001") as string;

export interface FleetCell {
  kind: ShipKind;
  cells: Coord[];
}

// --- Server → client --------------------------------------------------------
export interface ServerToClientEvents {
  "queue:waiting": (msg: { stake: string }) => void;
  "match:ready": (msg: {
    matchId: `0x${string}`;
    you: "A" | "B";
    opponent: `0x${string}`;
    stake: string;
  }) => void;
  "match:fleetAccepted": (msg: { matchId: `0x${string}` }) => void;
  "match:start": (msg: { matchId: `0x${string}`; firstTurn: `0x${string}` }) => void;
  "match:shot": (msg: {
    matchId: `0x${string}`;
    by: `0x${string}`;
    row: number;
    col: number;
    outcome: "miss" | "hit" | "sunk";
    sunkShipCells?: Coord[];
  }) => void;
  "match:end": (msg: {
    matchId: `0x${string}`;
    winner: `0x${string}`;
    loser: `0x${string}`;
    signature: `0x${string}` | null;
    lobbyAddress: `0x${string}` | null;
    chainId: number;
  }) => void;
  "match:opponentLeft": (msg: { matchId: `0x${string}` }) => void;
  error: (msg: { message: string }) => void;
}

// --- Client → server --------------------------------------------------------
export interface ClientToServerEvents {
  "queue:join": (msg: {
    address: `0x${string}`;
    stake: string;
    matchId?: `0x${string}`;
  }) => void;
  "queue:leave": () => void;
  "match:placeFleet": (msg: { matchId: `0x${string}`; fleet: FleetCell[] }) => void;
  "match:fire": (msg: { matchId: `0x${string}`; row: number; col: number }) => void;
}

export type PvpSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Build a PvP socket. When `token` is supplied (the SIWE JWT for the
 * connected wallet) it is attached to the handshake; the server (audit H5)
 * rejects the connection if the token is missing/expired/forged or if the
 * subsequent `queue:join` claims a different address. Pass `null` for dev /
 * unauthed deployments — the server falls back to the legacy permissive
 * path in that mode.
 */
export function createPvpSocket(token: string | null = null): PvpSocket {
  return io(SERVER_URL, {
    autoConnect: false,
    transports: ["websocket"],
    forceNew: true,
    auth: token ? { token } : undefined,
  });
}
