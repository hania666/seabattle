import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, type Hex, type TransactionReceipt } from "viem";
import { BATTLESHIP_LOBBY_ADDRESS, battleshipLobbyAbi } from "../../lib/contracts";
import { createPvpSocket, type PvpSocket, type FleetCell } from "../../lib/socket";
import { useAuth } from "../../lib/useAuth";
import type { StakeOption } from "../../lib/pvp/stakes";
import { STAKE_OPTIONS, findStake } from "../../lib/pvp/stakes";
import { initialStage, reduce } from "../../lib/pvp/state";
import type { Board } from "../../lib/game/types";
import { StakeSelect } from "./StakeSelect";
import { ShipPlacement } from "../pve/ShipPlacement";
import { PvpGameBoard } from "./PvpGameBoard";
import { PvpResultScreen } from "./PvpResultScreen";
import { BackLink, Button, StatusCard, TxLink, useToast } from "../../components/ui";
import { errMessage, shortAddress, shortHash } from "../../lib/format";
import { loadStats, recordMatch, saveStats } from "../../lib/stats";
import { addProgress, markIf } from "../../lib/achievements";
import {
  applyXpDelta,
  currentLossStreak,
  lossStreakPenalty,
  STREAK_THRESHOLD,
} from "../../lib/rankDecay";

export function PvpScreen({ onExit }: { onExit: () => void }) {
  const { address, isConnected } = useAccount();
  const { token: authToken } = useAuth();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();

  const [stage, dispatch] = useReducer(reduce, initialStage);
  const [error, setError] = useState<string | null>(null);
  const [ownBoard, setOwnBoard] = useState<Board | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | undefined>();
  const [refundTxHash, setRefundTxHash] = useState<`0x${string}` | undefined>();
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | undefined>();
  const socketRef = useRef<PvpSocket | null>(null);
  const currentStakeRef = useRef<StakeOption | null>(null);
  const currentModeRef = useRef<"host" | "join" | null>(null);
  // Kept in refs so socket handlers always see the latest wagmi / viem primitives
  // without forcing `ensureSocket` to rebuild on every render.
  const writeContractRef = useRef(writeContractAsync);
  const publicClientRef = useRef(publicClient);
  const addressRef = useRef(address);
  const toastRef = useRef(toast);
  useEffect(() => {
    writeContractRef.current = writeContractAsync;
  }, [writeContractAsync]);
  useEffect(() => {
    publicClientRef.current = publicClient;
  }, [publicClient]);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const hasLobbyContract = Boolean(BATTLESHIP_LOBBY_ADDRESS);
  const canStart = isConnected && hasLobbyContract;

  const ensureSocket = useCallback((): PvpSocket => {
    if (!socketRef.current) {
      // Audit H5: attach the SIWE JWT so the server can verify this socket
      // controls the wallet it queues for. Production server requires it;
      // dev / unauthed deployments accept null.
      const s = createPvpSocket(authToken);
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
          const msg = errMessage(e);
          setError(msg);
          toastRef.current.push({ tone: "error", title: "joinLobby failed", message: msg });
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
        const own = addressRef.current;
        const stake = currentStakeRef.current;
        if (own) {
          const won = msg.winner.toLowerCase() === own.toLowerCase();
          const prev = loadStats(own);
          const priorTotalWins = prev.pveWins + prev.pvpWins;
          const next = recordMatch(own, {
            mode: "pvp",
            won,
            stakeEth: stake?.eth,
          });
          addProgress(own, "hundredMatches");
          addProgress(own, "fiveHundredMatches");
          if (won) {
            markIf(own, "firstWin", priorTotalWins === 0);
            markIf(own, "rankMatros", next.xp >= 100);
            markIf(own, "rankMichman", next.xp >= 1500);
            markIf(own, "rankLieutenant", next.xp >= 3000);
            markIf(own, "rankAdmiral", next.xp >= 20000);
          }
          if (!won) {
            const streak = currentLossStreak(next);
            if (streak >= STREAK_THRESHOLD) {
              const prevXp = loadStats(own).xp;
              const penalty = lossStreakPenalty(prevXp);
              const xpNext = applyXpDelta(prevXp, -penalty);
              if (xpNext !== prevXp) {
                saveStats({ ...next, xp: xpNext }, own);
              }
            }
          }
        }
        dispatch({
          type: "match_ended",
          winner: msg.winner,
          signature: msg.signature,
          lobbyAddress: msg.lobbyAddress,
        });
      });
      s.on("match:opponentLeft", () => {
        toastRef.current.push({
          tone: "error",
          title: "Opponent left",
          message: "Your opponent disconnected. If you staked, you can refund via claimTimeout.",
        });
        dispatch({ type: "abort", reason: "Opponent disconnected" });
      });
      s.on("error", (msg) => {
        setError(msg.message);
        toastRef.current.push({ tone: "error", title: "Server error", message: msg.message });
      });
      s.on("disconnect", (reason) => {
        if (reason === "io client disconnect") return;
        toastRef.current.push({
          tone: "error",
          title: "Disconnected",
          message: "Lost connection to the matchmaking server. Try again.",
        });
      });
      socketRef.current = s;
    }
    if (!socketRef.current.connected) socketRef.current.connect();
    return socketRef.current;
  }, [authToken]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleStart = useCallback(
    // pvpMode is reserved for a follow-up PR where Arcade grants a symmetric
    // 1 Bomb + 1 Radar loadout via the server. Classic is the only active
    // variant for now; we still accept the arg so StakeSelect's signature is
    // stable when the Arcade path ships.
    async (mode: "host" | "join", stake: StakeOption, _pvpMode: "classic" | "arcade") => {
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
        const msg = errMessage(e);
        setError(msg);
        toast.push({ tone: "error", title: "Transaction failed", message: msg });
      }
    },
    [address, ensureSocket, publicClient, toast, writeContractAsync],
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
      toast.push({ tone: "success", title: "Pot claimed", message: "95 % of the pot is in your wallet." });
      // Intentionally do NOT dispatch `claim_confirmed` here — we want to keep
      // the stage on `ended` so `PvpResultScreen` stays mounted and can show
      // the claim tx hash + Abscan link. Transitioning to `claimed` would
      // unmount the result screen and hide the block-explorer link.
    } catch (e) {
      const msg = errMessage(e);
      setClaimError(msg);
      toast.push({ tone: "error", title: "Claim failed", message: msg });
    } finally {
      setClaiming(false);
    }
  }, [stage, writeContractAsync, publicClient, toast]);

  const handleRefund = useCallback(async () => {
    if (stage.name !== "aborted" || !stage.matchId || !BATTLESHIP_LOBBY_ADDRESS) return;
    setRefunding(true);
    setRefundError(undefined);
    try {
      const hash = await writeContractAsync({
        address: BATTLESHIP_LOBBY_ADDRESS as `0x${string}`,
        abi: battleshipLobbyAbi,
        functionName: "claimTimeout",
        args: [stage.matchId],
      });
      setRefundTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });
      toast.push({ tone: "success", title: "Refund claimed", message: "Your stake has been returned." });
    } catch (e) {
      const msg = errMessage(e);
      setRefundError(msg);
      toast.push({ tone: "error", title: "Refund failed", message: msg });
    } finally {
      setRefunding(false);
    }
  }, [stage, writeContractAsync, publicClient, toast]);

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

  const stakeId = "stakeId" in stage ? stage.stakeId : undefined;
  const stake = (stakeId && findStake(stakeId)) || STAKE_OPTIONS[0];

  if (stage.name === "txCreate" || stage.name === "txJoin") {
    return (
      <StatusCard title={stage.name === "txCreate" ? "Creating lobby…" : "Joining lobby…"}>
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-sm text-sea-300">Approve the transaction in your wallet.</p>
        )}
        {"txHash" in stage && stage.txHash && <TxLink hash={stage.txHash} label="tx" />}
        <div className="pt-2">
          <BackLink onClick={onExit} />
        </div>
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
          <p className="font-mono text-[11px] text-sea-500">matchId: {shortHash(stage.matchId)}</p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="pt-2">
          <BackLink onClick={onExit} />
        </div>
      </StatusCard>
    );
  }

  if (stage.name === "placement") {
    return (
      <div className="space-y-4">
        <MatchHeader
          stakeEth={stake.eth}
          matchId={stage.matchId}
          opponent={stage.opponent}
          label="Place your fleet"
        />
        <ShipPlacement onReady={handleFleetReady} onBack={onExit} />
      </div>
    );
  }

  if (stage.name === "waitingOpponentPlacement") {
    return (
      <StatusCard title="Fleet submitted">
        <p className="text-sm text-sea-300">Waiting for opponent to place their fleet…</p>
        <p className="text-xs text-sea-400">
          vs <span className="font-mono">{shortAddress(stage.opponent)}</span>
        </p>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="pt-2">
          <BackLink onClick={onExit} />
        </div>
      </StatusCard>
    );
  }

  if (stage.name === "playing" && ownBoard) {
    const myTurn = stage.turn.toLowerCase() === address?.toLowerCase();
    const turnLabel = myTurn ? "Your shot" : "Opponent's turn";
    return (
      <div className="space-y-4">
        <MatchHeader
          stakeEth={stake.eth}
          matchId={stage.matchId}
          opponent={stage.opponent}
          label={turnLabel}
        />
        <PvpGameBoard
          ownBoard={ownBoard}
          ownShots={stage.ownShots}
          opponentShots={stage.opponentShots}
          canFire={myTurn}
          onFire={handleFire}
          turnLabel={turnLabel}
        />
      </div>
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
        opponent={stage.opponent}
        matchId={stage.matchId}
        onClaim={handleClaim}
        onExit={onExit}
      />
    );
  }

  if (stage.name === "aborted") {
    const canRefund = Boolean(stage.matchId && BATTLESHIP_LOBBY_ADDRESS) && !refundTxHash;
    return (
      <StatusCard title="Match aborted" tone="danger">
        <p className="text-sm text-sea-200">{stage.reason}.</p>
        <p className="text-xs text-sea-300">
          If you locked a stake on-chain, call <code>claimTimeout</code> after the 30 min timeout
          window to refund it.
        </p>
        {stage.matchId && (
          <p className="font-mono text-[11px] text-sea-500">matchId: {shortHash(stage.matchId)}</p>
        )}
        {canRefund && (
          <Button
            size="md"
            variant="primary"
            onClick={handleRefund}
            disabled={refunding}
            data-testid="refund-button"
          >
            {refunding ? "Refunding…" : "Claim timeout refund"}
          </Button>
        )}
        {refundTxHash && (
          <p className="text-xs text-sea-300">
            Refund submitted. <TxLink hash={refundTxHash} />
          </p>
        )}
        {refundError && <p className="text-xs text-red-300">{refundError}</p>}
        <div className="pt-2">
          <BackLink onClick={onExit} />
        </div>
      </StatusCard>
    );
  }

  return null;
}

function MatchHeader({
  stakeEth,
  matchId,
  opponent,
  label,
}: {
  stakeEth: string;
  matchId: `0x${string}`;
  opponent: `0x${string}`;
  label: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-sea-700/60 bg-sea-900/40 px-4 py-2 text-xs text-sea-300">
      <div className="flex items-center gap-4">
        <span>
          Stake <strong className="text-sea-100">{stakeEth} ETH</strong>
        </span>
        <span className="hidden sm:inline">
          vs <span className="font-mono text-sea-200">{shortAddress(opponent)}</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] text-sea-500">match {shortHash(matchId)}</span>
        <span className="font-semibold text-sea-200">{label}</span>
      </div>
    </div>
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


