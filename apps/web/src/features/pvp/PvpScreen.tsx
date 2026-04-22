import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, type Hex, type TransactionReceipt } from "viem";
import { BATTLESHIP_LOBBY_ADDRESS, battleshipLobbyAbi } from "../../lib/contracts";
import { createPvpSocket, type PvpSocket, type FleetCell } from "../../lib/socket";
import type { StakeOption } from "../../lib/pvp/stakes";
import { STAKE_OPTIONS, findStake } from "../../lib/pvp/stakes";
import { initialStage, reduce } from "../../lib/pvp/state";
import type { Board } from "../../lib/game/types";
import { StakeSelect } from "./StakeSelect";
import { ShipPlacement } from "../pve/ShipPlacement";
import { PvpGameBoard } from "./PvpGameBoard";
import { PvpResultScreen } from "./PvpResultScreen";

export function PvpScreen({ onExit }: { onExit: () => void }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [stage, dispatch] = useReducer(reduce, initialStage);
  const [error, setError] = useState<string | null>(null);
  const [ownBoard, setOwnBoard] = useState<Board | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | undefined>();
  const socketRef = useRef<PvpSocket | null>(null);
  const currentStakeRef = useRef<StakeOption | null>(null);
  const currentModeRef = useRef<"host" | "join" | null>(null);
  // Kept in refs so socket handlers always see the latest wagmi / viem primitives
  // without forcing `ensureSocket` to rebuild on every render.
  const writeContractRef = useRef(writeContractAsync);
  const publicClientRef = useRef(publicClient);
  const addressRef = useRef(address);
  useEffect(() => {
    writeContractRef.current = writeContractAsync;
  }, [writeContractAsync]);
  useEffect(() => {
    publicClientRef.current = publicClient;
  }, [publicClient]);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const hasLobbyContract = Boolean(BATTLESHIP_LOBBY_ADDRESS);
  const canStart = isConnected && hasLobbyContract;

  const ensureSocket = useCallback((): PvpSocket => {
    if (!socketRef.current) {
      const s = createPvpSocket();
      s.on("queue:waiting", () => {
        /* already handled via stage */
      });
      s.on("match:ready", async (msg) => {
        dispatch({
          type: "match_ready",
          matchId: msg.matchId,
          you: msg.you,
          opponent: msg.opponent,
        });
        // Joiner path: the server paired us with a lobby. Call joinLobby
        // on-chain now, then the server-side fleet phase can begin. Runs here
        // (not in a useEffect) so the async chain isn't subject to effect
        // cleanups racing with intermediate dispatches.
        if (currentModeRef.current !== "join") return;
        const stake = currentStakeRef.current;
        if (!stake) return;
        try {
          const hash = await writeContractRef.current({
            address: BATTLESHIP_LOBBY_ADDRESS as `0x${string}`,
            abi: battleshipLobbyAbi,
            functionName: "joinLobby",
            args: [msg.matchId],
            value: stake.wei,
          });
          dispatch({ type: "tx_join_sent", txHash: hash });
          await publicClientRef.current?.waitForTransactionReceipt({ hash });
          dispatch({ type: "tx_join_confirmed" });
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
      s.on("match:start", (msg) => {
        dispatch({ type: "match_started", firstTurn: msg.firstTurn });
      });
      s.on("match:shot", (msg) => {
        const own = addressRef.current;
        if (!own) return;
        dispatch({
          type: "shot",
          by: msg.by,
          coord: [msg.row, msg.col],
          outcome: msg.outcome,
          sunkShipCells: msg.sunkShipCells,
          ownAddress: own,
        });
      });
      s.on("match:end", (msg) => {
        dispatch({
          type: "match_ended",
          winner: msg.winner,
          signature: msg.signature,
          lobbyAddress: msg.lobbyAddress,
        });
      });
      s.on("match:opponentLeft", () => {
        dispatch({ type: "abort", reason: "Opponent disconnected" });
      });
      s.on("error", (msg) => setError(msg.message));
      socketRef.current = s;
    }
    if (!socketRef.current.connected) socketRef.current.connect();
    return socketRef.current;
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleStart = useCallback(
    async (mode: "host" | "join", stake: StakeOption) => {
      setError(null);
      currentStakeRef.current = stake;
      currentModeRef.current = mode;
      if (!address) {
        setError("Connect your wallet first.");
        return;
      }
      dispatch({ type: "select_mode", mode, stakeId: stake.id });
      const socket = ensureSocket();

      try {
        if (mode === "host") {
          const txHash = await writeContractAsync({
            address: BATTLESHIP_LOBBY_ADDRESS as `0x${string}`,
            abi: battleshipLobbyAbi,
            functionName: "createLobby",
            args: [],
            value: stake.wei,
          });
          dispatch({ type: "tx_create_sent", txHash });
          const matchId = await extractMatchIdFromReceipt(publicClient, txHash);
          if (!matchId) {
            setError("Could not read matchId from createLobby receipt.");
            return;
          }
          dispatch({ type: "tx_create_confirmed", matchId });
          socket.emit("queue:join", {
            address,
            stake: stake.wei.toString(),
            matchId,
          });
        } else {
          // Joiner — queue first; wait for match:ready to know which lobby to join.
          socket.emit("queue:join", {
            address,
            stake: stake.wei.toString(),
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [address, ensureSocket, publicClient, writeContractAsync],
  );

  const handleFleetReady = useCallback(
    (board: Board) => {
      if (stage.name !== "placement") return;
      setOwnBoard(board);
      const fleet: FleetCell[] = board.ships.map((s) => ({ kind: s.kind, cells: s.cells }));
      socketRef.current?.emit("match:placeFleet", { matchId: stage.matchId, fleet });
      dispatch({ type: "fleet_submitted" });
    },
    [stage],
  );

  const handleFire = useCallback(
    (row: number, col: number) => {
      if (stage.name !== "playing") return;
      if (stage.turn.toLowerCase() !== address?.toLowerCase()) return;
      socketRef.current?.emit("match:fire", { matchId: stage.matchId, row, col });
    },
    [stage, address],
  );

  const handleClaim = useCallback(async () => {
    if (stage.name !== "ended" || !stage.signature || !stage.lobbyAddress) return;
    setClaiming(true);
    setClaimError(undefined);
    try {
      const hash = await writeContractAsync({
        address: stage.lobbyAddress,
        abi: battleshipLobbyAbi,
        functionName: "claimWin",
        args: [stage.matchId, stage.winner, stage.signature],
      });
      setClaimTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });
      setClaimed(true);
      dispatch({ type: "claim_confirmed" });
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : String(e));
    } finally {
      setClaiming(false);
    }
  }, [stage, writeContractAsync, publicClient]);

  // --- Render -------------------------------------------------------------

  if (stage.name === "select") {
    return (
      <StakeSelect
        onStart={handleStart}
        onBack={onExit}
        disabled={!canStart}
        disabledReason={
          !isConnected
            ? "Connect your Abstract wallet to start a PvP match."
            : !hasLobbyContract
              ? "Lobby contract address is not configured — set VITE_BATTLESHIP_LOBBY_ADDRESS."
              : undefined
        }
      />
    );
  }

  const stake = findStake("stakeId" in stage ? stage.stakeId : STAKE_OPTIONS[0].id) ?? STAKE_OPTIONS[0];

  if (stage.name === "txCreate" || stage.name === "txJoin") {
    return (
      <StatusCard title={stage.name === "txCreate" ? "Creating lobby…" : "Joining lobby…"}>
        {error ? <p className="text-sm text-red-300">{error}</p> : <p>Approve the transaction in your wallet.</p>}
        {"txHash" in stage && stage.txHash && (
          <p className="font-mono text-xs text-sea-400">tx: {stage.txHash.slice(0, 12)}…</p>
        )}
        <BackButton onClick={onExit} />
      </StatusCard>
    );
  }

  if (stage.name === "queued") {
    return (
      <StatusCard title="Waiting for opponent…">
        <p className="text-sm text-sea-300">
          Stake <strong>{stake.eth} ETH</strong>. Next player with the same stake is paired
          automatically.
        </p>
        {stage.matchId && (
          <p className="font-mono text-[11px] text-sea-500">matchId: {stage.matchId.slice(0, 18)}…</p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <BackButton onClick={onExit} />
      </StatusCard>
    );
  }

  if (stage.name === "placement") {
    return (
      <ShipPlacement onReady={handleFleetReady} onBack={onExit} />
    );
  }

  if (stage.name === "waitingOpponentPlacement") {
    return (
      <StatusCard title="Fleet submitted">
        <p className="text-sm text-sea-300">Waiting for opponent to place their fleet…</p>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <BackButton onClick={onExit} />
      </StatusCard>
    );
  }

  if (stage.name === "playing" && ownBoard) {
    const myTurn = stage.turn.toLowerCase() === address?.toLowerCase();
    const turnLabel = myTurn ? "Your shot" : "Opponent's turn";
    return (
      <PvpGameBoard
        ownBoard={ownBoard}
        ownShots={stage.ownShots}
        opponentShots={stage.opponentShots}
        canFire={myTurn}
        onFire={handleFire}
        turnLabel={turnLabel}
      />
    );
  }

  if (stage.name === "ended") {
    const won = stage.winner.toLowerCase() === address?.toLowerCase();
    const canClaim = Boolean(stage.signature && stage.lobbyAddress) && won;
    return (
      <PvpResultScreen
        won={won}
        stakeEth={stake.eth}
        canClaim={canClaim}
        claiming={claiming}
        claimed={claimed}
        claimTxHash={claimTxHash}
        claimError={claimError}
        onClaim={handleClaim}
        onExit={onExit}
      />
    );
  }

  if (stage.name === "claimed") {
    return (
      <StatusCard title="Paid out">
        <p className="text-sm text-sea-300">Your winnings are on the way.</p>
        <BackButton onClick={onExit} />
      </StatusCard>
    );
  }

  if (stage.name === "aborted") {
    return (
      <StatusCard title="Match aborted">
        <p className="text-sm text-sea-300">{stage.reason}. You can still call <code>claimTimeout</code> after the timeout window if you staked.</p>
        <BackButton onClick={onExit} />
      </StatusCard>
    );
  }

  return null;
}

function StatusCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-sea-700/60 bg-sea-900/60 p-8 text-center">
      <h2 className="font-display text-2xl text-sea-50">{title}</h2>
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 text-sm text-sea-400 underline-offset-4 hover:text-sea-200 hover:underline"
    >
      ← Back to home
    </button>
  );
}

/** Extract LobbyCreated.matchId from a createLobby transaction receipt. */
async function extractMatchIdFromReceipt(
  publicClient: ReturnType<typeof usePublicClient>,
  txHash: Hex,
): Promise<`0x${string}` | null> {
  if (!publicClient) return null;
  const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: battleshipLobbyAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "LobbyCreated") {
        return decoded.args.matchId as `0x${string}`;
      }
    } catch {
      /* not a LobbyCreated log, skip */
    }
  }
  return null;
}


