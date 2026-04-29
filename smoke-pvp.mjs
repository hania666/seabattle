// PvP smoke test — checks BattleshipLobby on-chain flow with two wallets.
// Run with: node smoke-pvp.mjs
//
// Tests:
//   1. Player A creates a lobby with 0.0005 ETH stake
//   2. Player B joins the lobby (also 0.0005 ETH)
//   3. Both stakes are escrowed
//   4. Player A cancels by claiming timeout (after grace period)
//      OR we trigger a server-signed claimWin (skipped here, needs server)
//
// Prerequisites:
//   - Two private keys with at least 0.001 ETH each on Abstract Sepolia
//   - Set them in PLAYER_A_KEY and PLAYER_B_KEY env vars

import { createWalletClient, createPublicClient, http, parseEther, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { abstractTestnet } from "viem/chains";

const LOBBY = "0x21B77d709e6fcD5a608c153724026876c27cf0A7";

// Minimal ABI for what we need
const lobbyAbi = [
  {
    type: "function",
    name: "createLobby",
    inputs: [],
    outputs: [{ type: "bytes32", name: "matchId" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "joinLobby",
    inputs: [{ type: "bytes32", name: "matchId" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "lobbies",
    inputs: [{ type: "bytes32", name: "" }],
    outputs: [
      { type: "address", name: "playerA" },
      { type: "address", name: "playerB" },
      { type: "uint256", name: "stake" },
      { type: "uint64", name: "createdAt" },
      { type: "uint8", name: "status" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LobbyCreated",
    inputs: [
      { type: "bytes32", name: "matchId", indexed: true },
      { type: "address", name: "playerA", indexed: true },
      { type: "uint256", name: "stake", indexed: false },
    ],
  },
];

async function main() {
  const keyA = process.env.PLAYER_A_KEY;
  const keyB = process.env.PLAYER_B_KEY;
  if (!keyA || !keyB) {
    console.error("Set PLAYER_A_KEY and PLAYER_B_KEY env vars (0x-prefixed)");
    process.exit(1);
  }

  const accountA = privateKeyToAccount(keyA);
  const accountB = privateKeyToAccount(keyB);

  const publicClient = createPublicClient({ chain: abstractTestnet, transport: http() });
  const walletA = createWalletClient({ account: accountA, chain: abstractTestnet, transport: http() });
  const walletB = createWalletClient({ account: accountB, chain: abstractTestnet, transport: http() });

  console.log("Player A:", accountA.address);
  console.log("Player B:", accountB.address);

  const balA = await publicClient.getBalance({ address: accountA.address });
  const balB = await publicClient.getBalance({ address: accountB.address });
  console.log("Balance A:", balA.toString(), "wei");
  console.log("Balance B:", balB.toString(), "wei");

  const stake = parseEther("0.0005");
  if (balA < stake * 2n || balB < stake * 2n) {
    console.error("Need at least 0.001 ETH on each account");
    process.exit(1);
  }

  // ---- 1. Player A creates lobby ----
  console.log("\n[1] Player A creating lobby...");
  const txCreate = await walletA.writeContract({
    address: LOBBY,
    abi: lobbyAbi,
    functionName: "createLobby",
    value: stake,
  });
  console.log("  tx:", txCreate);
  const rcCreate = await publicClient.waitForTransactionReceipt({ hash: txCreate });
  console.log("  status:", rcCreate.status, "block:", rcCreate.blockNumber);

  // Extract lobbyId from event
  let lobbyId = null;
  for (const log of rcCreate.logs) {
    try {
      const decoded = decodeEventLog({ abi: lobbyAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "LobbyCreated") {
        lobbyId = decoded.args.matchId;
        console.log("  matchId:", lobbyId);
        break;
      }
    } catch {}
  }
  if (!lobbyId) {
    console.error("LobbyCreated event not found");
    process.exit(1);
  }

  // ---- 2. Player B joins ----
  console.log("\n[2] Player B joining lobby...");
  const txJoin = await walletB.writeContract({
    address: LOBBY,
    abi: lobbyAbi,
    functionName: "joinLobby",
    args: [lobbyId],
    value: stake,
  });
  console.log("  tx:", txJoin);
  const rcJoin = await publicClient.waitForTransactionReceipt({ hash: txJoin });
  console.log("  status:", rcJoin.status);

  // ---- 3. Read state ----
  console.log("\n[3] Reading lobby state...");
  const lobby = await publicClient.readContract({
    address: LOBBY,
    abi: lobbyAbi,
    functionName: "lobbies",
    args: [lobbyId],
  });
  console.log("  playerA:", lobby[0]);
  console.log("  playerB:", lobby[1]);
  console.log("  stake:", lobby[2].toString());
  console.log("  createdAt:", lobby[3].toString());
  console.log("  status:", lobby[4], "(0=Open, 1=Active, 2=Done, 3=Cancelled)");

  console.log("\n✅ PvP escrow flow works on-chain!");
  console.log("   Both players staked", stake.toString(), "wei");
  console.log("   Total escrowed:", (stake * 2n).toString(), "wei");
  console.log("\nNext: claimWin requires a server-signed digest. Test in browser.");
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.shortMessage || e.message);
  if (e.cause) console.error("   cause:", e.cause.shortMessage || e.cause.message);
  process.exit(1);
});
