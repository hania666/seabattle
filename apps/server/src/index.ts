import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { loadEnv } from "./env";
import { registerSocketHandlers } from "./socket";
import { signResult } from "./signer";

const env = loadEnv();

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "sea3battle-server",
    ts: Date.now(),
    signer: env.signer.address,
    chainId: env.chainId,
    lobbyAddress: env.lobbyAddress,
    botMatchAddress: env.botMatchAddress,
  });
});

/**
 * POST /api/bot-result
 * Body: { matchId: 0x..., player: 0x..., won: boolean }
 * Returns: { signature, digest, botMatchAddress, chainId }
 *
 * This is the PvE equivalent of `match:end`. The frontend calls this after the
 * local bot match completes to obtain a signature that `BotMatch.recordResult`
 * will accept. Since PvE is single-player, the server trusts the claimed
 * outcome today; Phase 7 can add fraud-proofs if we care.
 */
app.post("/api/bot-result", async (req, res) => {
  const { matchId, player, won } = req.body ?? {};
  if (!/^0x[a-fA-F0-9]{64}$/.test(matchId ?? "")) {
    return res.status(400).json({ error: "invalid matchId" });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(player ?? "")) {
    return res.status(400).json({ error: "invalid player address" });
  }
  if (typeof won !== "boolean") {
    return res.status(400).json({ error: "won must be boolean" });
  }
  if (!env.botMatchAddress) {
    return res.status(503).json({ error: "BOT_MATCH_ADDRESS not configured" });
  }
  const signature = await signResult(env.signer, {
    chainId: env.chainId,
    botMatchAddress: env.botMatchAddress,
    matchId,
    player,
    won,
  });
  return res.json({
    signature,
    botMatchAddress: env.botMatchAddress,
    chainId: env.chainId,
  });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.corsOrigin },
});

registerSocketHandlers(io, env);

server.listen(env.port, () => {
  console.log(`[sea3battle-server] listening on :${env.port}`);
  console.log(`[sea3battle-server] signer: ${env.signer.address}`);
});
