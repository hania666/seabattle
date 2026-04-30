import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Env } from "./env";
import { type AuthEnv, verifyJwt } from "./auth";
import { normaliseWallet } from "./db";
import { Match, type PlayerSide } from "./game/match";
import type { FleetInput } from "./game/board";
import { Matchmaker, type QueueEntry, recordPair } from "./matchmaking";
import { signClaim } from "./signer";

const TURN_TIMEOUT_MS  = 90_000;
const PLACE_TIMEOUT_MS = 60_000;
const FIRE_MIN_MS      = 200;

interface SocketData {
  wallet?: string;
}

type AuthSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  SocketData
>;

interface QueueJoinMsg {
  address: `0x${string}`;
  stake: string;
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
  placed: Set<PlayerSide>;
  lastFireAt: Record<PlayerSide, number>;
}

export function registerSocketHandlers(
  io: SocketIOServer,
  env: Env,
  authEnv: AuthEnv | null,
) {
  if (authEnv) {
    io.use((socket, next) => {
      const s = socket as AuthSocket;
      const raw = (s.handshake.auth as { token?: unknown } | undefined)?.token;
      const token = typeof raw === "string" ? raw : null;
      if (!token) return next(new Error("missing token"));
      try {
        const claims = verifyJwt(token, authEnv.jwtVerifySecrets);
        s.data.wallet = normaliseWallet(claims.sub);
        next();
      } catch {
        next(new Error("invalid or expired token"));
      }
    });
  }

  const matchmaker = new Matchmaker();
  const matches = new Map<string, ActiveMatch>();
  const timers  = new Map<string, NodeJS.Timeout>();

  function error(socket: Socket, message: string) {
    socket.emit("error", { message });
  }

  function sideOf(active: ActiveMatch, socketId: string): PlayerSide | null {
    if (active.sockets.A === socketId) return "A";
    if (active.sockets.B === socketId) return "B";
    return null;
  }

  function clearTimer(matchId: string) {
    const t = timers.get(matchId);
    if (t) { clearTimeout(t); timers.delete(matchId); }
  }

  async function endMatch(
    matchId: `0x${string}`,
    winner: `0x${string}`,
    loser: `0x${string}`,
    reason?: string,
  ) {
    const active = matches.get(matchId);
    if (!active) return;
    matches.delete(matchId);
    clearTimer(matchId);

    let signature: `0x${string}` | null = null;
    if (env.lobbyAddress) {
      signature = await signClaim(env.signer, {
        chainId: env.chainId,
        lobbyAddress: env.lobbyAddress,
        matchId,
        winner,
      });
    }

    const payload = {
      matchId,
      winner,
      loser,
      signature,
      lobbyAddress: env.lobbyAddress,
      chainId: env.chainId,
      ...(reason && { reason }),
    };
    io.to(active.sockets.A).emit("match:end", payload);
    io.to(active.sockets.B).emit("match:end", payload);
  }

  function startTurnTimer(matchId: `0x${string}`) {
    clearTimer(matchId);
    const active = matches.get(matchId);
    if (!active) return;

    const turn = active.match.getTurn();
    const turnAddr = turn === "A" ? active.match.playerA : active.match.playerB;
    io.to(active.sockets.A).emit("match:turnTimer", { turn: turnAddr, timeoutMs: TURN_TIMEOUT_MS });
    io.to(active.sockets.B).emit("match:turnTimer", { turn: turnAddr, timeoutMs: TURN_TIMEOUT_MS });

    timers.set(matchId, setTimeout(() => {
      const still = matches.get(matchId);
      if (!still) return;
      const timedOut = still.match.getTurn();
      const loser  = timedOut === "A" ? still.match.playerA : still.match.playerB;
      const winner = timedOut === "A" ? still.match.playerB : still.match.playerA;
      void endMatch(matchId, winner, loser, "timeout");
    }, TURN_TIMEOUT_MS));
  }

  function startPlaceTimer(matchId: `0x${string}`) {
    clearTimer(matchId);
    timers.set(matchId, setTimeout(() => {
      const active = matches.get(matchId);
      if (!active) return;
      const aPlaced = active.placed.has("A");
      const bPlaced = active.placed.has("B");
      if (!aPlaced && !bPlaced) { matches.delete(matchId); clearTimer(matchId); return; }
      const loserSide: PlayerSide = !aPlaced ? "A" : "B";
      const loser  = loserSide === "A" ? active.match.playerA : active.match.playerB;
      const winner = loserSide === "A" ? active.match.playerB : active.match.playerA;
      void endMatch(matchId, winner, loser, "timeout");
    }, PLACE_TIMEOUT_MS));
  }

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("queue:join", async (msg: QueueJoinMsg) => {
      let stake: bigint;
      try { stake = BigInt(msg.stake); } catch { return error(socket, "invalid stake"); }
      if (stake <= 0n) return error(socket, "stake must be positive");
      if (!/^0x[a-fA-F0-9]{40}$/.test(msg.address)) return error(socket, "invalid address");

      if (authEnv) {
        const claimed = normaliseWallet(msg.address);
        const tokenWallet = (socket as AuthSocket).data.wallet;
        if (tokenWallet !== claimed) return error(socket, "wallet does not match auth token");
      }

      const entry: QueueEntry = {
        socketId: socket.id,
        address: msg.address,
        stake,
        matchId: msg.matchId,
      };

      const pairing = matchmaker.enqueue(entry);
      if (!pairing) { socket.emit("queue:waiting", { stake: msg.stake }); return; }

      const match = new Match({
        matchId: pairing.matchId,
        stake: pairing.stake,
        playerA: pairing.playerA.address,
        playerB: pairing.playerB.address,
      });
      const active: ActiveMatch = {
        match,
        sockets: { A: pairing.playerA.socketId, B: pairing.playerB.socketId },
        placed: new Set(),
        lastFireAt: { A: 0, B: 0 },
      };
      matches.set(match.matchId, active);

      (io as any).to(pairing.playerA.socketId).emit("match:ready", {
        matchId: match.matchId,
        you: "A",
        opponent: pairing.playerB.address,
        stake: stake.toString(),
      });
      (io as any).to(pairing.playerB.socketId).emit("match:ready", {
        matchId: match.matchId,
        you: "B",
        opponent: pairing.playerA.address,
        stake: stake.toString(),
      });

      recordPair(pairing.playerA.address, pairing.playerB.address);
      startPlaceTimer(match.matchId);
    });

    socket.on("match:placeFleet", (msg: PlaceFleetMsg) => {
      const active = matches.get(msg.matchId);
      if (!active) return error(socket, "match not found");
      const side = sideOf(active, socket.id);
      if (!side) return error(socket, "you are not in this match");

      const res = active.match.placeFleet(side, msg.fleet);
      if (!res.ok) return error(socket, res.error);
      active.placed.add(side);

      socket.emit("match:fleetAccepted", { matchId: msg.matchId });

      if (res.bothPlaced) {
        clearTimer(msg.matchId);
        const turn = active.match.getTurn();
        const firstPlayer = turn === "A" ? active.match.playerA : active.match.playerB;
        io.to(active.sockets.A).emit("match:start", { matchId: msg.matchId, firstTurn: firstPlayer });
        io.to(active.sockets.B).emit("match:start", { matchId: msg.matchId, firstTurn: firstPlayer });
        startTurnTimer(msg.matchId);
      }
    });

    socket.on("match:fire", async (msg: FireMsg) => {
      const active = matches.get(msg.matchId);
      if (!active) return error(socket, "match not found");
      const side = sideOf(active, socket.id);
      if (!side) return error(socket, "you are not in this match");

      const now = Date.now();
      if (now - active.lastFireAt[side] < FIRE_MIN_MS) return error(socket, "firing too fast");
      active.lastFireAt[side] = now;

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
        await endMatch(msg.matchId, result.winner, result.loser);
      } else {
        startTurnTimer(msg.matchId);
      }
    });

    socket.on("queue:leave", () => { matchmaker.remove(socket.id); });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      matchmaker.remove(socket.id);
      for (const [id, active] of matches) {
        const side = sideOf(active, socket.id);
        if (!side) continue;
        const loser  = side === "A" ? active.match.playerA : active.match.playerB;
        const winner = side === "A" ? active.match.playerB : active.match.playerA;
        void endMatch(id as `0x${string}`, winner, loser, "disconnect");
        break;
      }
    });
  });
}
