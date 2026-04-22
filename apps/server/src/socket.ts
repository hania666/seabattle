import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Env } from "./env";
import { Match, type PlayerSide } from "./game/match";
import type { FleetInput } from "./game/board";
import { Matchmaker, type QueueEntry } from "./matchmaking";
import { signClaim } from "./signer";

interface QueueJoinMsg {
  address: `0x${string}`;
  stake: string; // wei, decimal
  matchId?: `0x${string}`;
}

interface PlaceFleetMsg {
  matchId: `0x${string}`;
  fleet: FleetInput[];
}

interface FireMsg {
  matchId: `0x${string}`;
  row: number;
  col: number;
}

interface ActiveMatch {
  match: Match;
  sockets: Record<PlayerSide, string>;
}

export function registerSocketHandlers(io: SocketIOServer, env: Env) {
  const matchmaker = new Matchmaker();
  const matches = new Map<string, ActiveMatch>();

  function error(socket: Socket, message: string) {
    socket.emit("error", { message });
  }

  function sideOf(match: ActiveMatch, socketId: string): PlayerSide | null {
    if (match.sockets.A === socketId) return "A";
    if (match.sockets.B === socketId) return "B";
    return null;
  }

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("queue:join", async (msg: QueueJoinMsg) => {
      let stake: bigint;
      try {
        stake = BigInt(msg.stake);
      } catch {
        return error(socket, "invalid stake");
      }
      if (stake <= 0n) return error(socket, "stake must be positive");
      if (!/^0x[a-fA-F0-9]{40}$/.test(msg.address)) return error(socket, "invalid address");

      const entry: QueueEntry = {
        socketId: socket.id,
        address: msg.address,
        stake,
        matchId: msg.matchId,
      };

      const pairing = matchmaker.enqueue(entry);
      if (!pairing) {
        socket.emit("queue:waiting", { stake: msg.stake });
        return;
      }

      const match = new Match({
        matchId: pairing.matchId,
        stake: pairing.stake,
        playerA: pairing.playerA.address,
        playerB: pairing.playerB.address,
      });
      const active: ActiveMatch = {
        match,
        sockets: { A: pairing.playerA.socketId, B: pairing.playerB.socketId },
      };
      matches.set(match.matchId, active);

      const ioAny = io;
      ioAny.to(pairing.playerA.socketId).emit("match:ready", {
        matchId: match.matchId,
        you: "A",
        opponent: pairing.playerB.address,
        stake: stake.toString(),
      });
      ioAny.to(pairing.playerB.socketId).emit("match:ready", {
        matchId: match.matchId,
        you: "B",
        opponent: pairing.playerA.address,
        stake: stake.toString(),
      });
    });

    socket.on("match:placeFleet", (msg: PlaceFleetMsg) => {
      const active = matches.get(msg.matchId);
      if (!active) return error(socket, "match not found");
      const side = sideOf(active, socket.id);
      if (!side) return error(socket, "you are not in this match");

      const res = active.match.placeFleet(side, msg.fleet);
      if (!res.ok) return error(socket, res.error);

      socket.emit("match:fleetAccepted", { matchId: msg.matchId });
      if (res.bothPlaced) {
        const turn = active.match.getTurn();
        const firstPlayer = turn === "A" ? active.match.playerA : active.match.playerB;
        io.to(active.sockets.A).emit("match:start", {
          matchId: msg.matchId,
          firstTurn: firstPlayer,
        });
        io.to(active.sockets.B).emit("match:start", {
          matchId: msg.matchId,
          firstTurn: firstPlayer,
        });
      }
    });

    socket.on("match:fire", async (msg: FireMsg) => {
      const active = matches.get(msg.matchId);
      if (!active) return error(socket, "match not found");
      const side = sideOf(active, socket.id);
      if (!side) return error(socket, "you are not in this match");

      const res = active.match.fire(side, msg.row, msg.col);
      if (!res.ok) return error(socket, res.error);

      const payload = {
        matchId: msg.matchId,
        by: side === "A" ? active.match.playerA : active.match.playerB,
        row: msg.row,
        col: msg.col,
        outcome: res.outcome.outcome,
        sunkShipCells: res.outcome.sunkShipCells,
      };
      io.to(active.sockets.A).emit("match:shot", payload);
      io.to(active.sockets.B).emit("match:shot", payload);

      if (res.outcome.allSunk) {
        const result = active.match.getResult();
        if (!result) return;
        let signature: `0x${string}` | null = null;
        if (env.lobbyAddress) {
          signature = await signClaim(env.signer, {
            chainId: env.chainId,
            lobbyAddress: env.lobbyAddress,
            matchId: msg.matchId,
            winner: result.winner,
          });
        }
        const endPayload = {
          matchId: msg.matchId,
          winner: result.winner,
          loser: result.loser,
          signature,
          lobbyAddress: env.lobbyAddress,
          chainId: env.chainId,
        };
        io.to(active.sockets.A).emit("match:end", endPayload);
        io.to(active.sockets.B).emit("match:end", endPayload);
        matches.delete(msg.matchId);
      }
    });

    socket.on("queue:leave", () => {
      matchmaker.remove(socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      matchmaker.remove(socket.id);
      // Notify any match the socket is in.
      for (const [id, active] of matches) {
        const side = sideOf(active, socket.id);
        if (!side) continue;
        const opponentSocket = side === "A" ? active.sockets.B : active.sockets.A;
        io.to(opponentSocket).emit("match:opponentLeft", { matchId: id });
        matches.delete(id);
      }
    });
  });
}
