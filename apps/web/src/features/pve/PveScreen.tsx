import { useEffect, useRef, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { decodeEventLog, parseEther, type Hex } from "viem";
import type { Board, Difficulty } from "../../lib/game/types";
import { DIFFICULTY_ENTRY_FEE_ETH, DIFFICULTY_LABELS } from "../../lib/game/types";
import { BOT_MATCH_ADDRESS, botMatchAbi } from "../../lib/contracts";
import { DifficultySelect } from "./DifficultySelect";
import { ShipPlacement } from "./ShipPlacement";
import { GameBoard, type PveFinishStats } from "./GameBoard";
import { ResultScreen } from "./ResultScreen";
import { BackLink, Button, StatusCard, TxLink } from "../../components/ui";
import { errMessage } from "../../lib/format";
import { loadStats, recordMatch } from "../../lib/stats";
import { grantPveReward, loadCoins } from "../../lib/coins";
import { addProgress, markIf, recordProgress } from "../../lib/achievements";
import {
  applyXpDelta,
  currentLossStreak,
  lossStreakPenalty,
  STREAK_THRESHOLD,
} from "../../lib/rankDecay";
import { saveStats } from "../../lib/stats";
import { useAuth } from "../../lib/useAuth";
import {
  finishPveMatch,
  PveApiError,
  startPveMatch,
  type Hex32,
  type PlacedShipWire,
} from "../../lib/pveApi";
import { Sentry } from "../../lib/sentry";

type Stage = "select" | "staking" | "placement" | "playing" | "result";

type ChainStatus = "idle" | "pending" | "success" | "failed" | "skipped";

export function PveScreen({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<Stage>("select");
  const [difficulty, setDifficulty] = useState<Difficulty>(0);
  const [playerBoard, setPlayerBoard] = useState<Board | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [result, setResult] = useState<{ won: boolean; playerShots: number; botShots: number } | null>(null);

  // Server-issued match metadata. `chainMatchId` is parsed from the
  // BotMatchStarted event in the playBot receipt; `seed` comes back from
  // /api/pve/start and is used for deterministic bot-fleet placement.
  const [chainMatchId, setChainMatchId] = useState<Hex32 | null>(null);
  const [seed, setSeed] = useState<Hex32 | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  // Tracks the on-chain recordResult settlement after a finished match.
  const [chainStatus, setChainStatus] = useState<ChainStatus>("idle");
  const [chainError, setChainError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { writeContractAsync, isPending: isSigning, error: writeError, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });
  const { session, authedFetch } = useAuth();

  const hasContract = Boolean(BOT_MATCH_ADDRESS);
  // Anti-cheat round-trip is only attempted when all three ingredients are
  // present: a deployed contract address, a connected wallet, and a SIWE
  // session. Anything missing → degraded "play locally, no chain claim"
  // mode (existing behaviour pre-PR).
  const antiCheatEnabled = hasContract && isConnected && Boolean(session);

  // Re-entrancy guard: useEffect can fire twice in StrictMode dev. We only
  // want one /api/pve/start call per playBot tx.
  const startedFor = useRef<string | null>(null);

  // After playBot mines, parse the bytes32 matchId out of BotMatchStarted
  // and exchange it for a server seed. Failures degrade gracefully — the
  // game still plays, just without a redeemable signature at the end.
  useEffect(() => {
    if (!isMined || !receipt || !antiCheatEnabled) return;
    if (chainMatchId) return;
    if (startedFor.current === receipt.transactionHash) return;
    startedFor.current = receipt.transactionHash;

    let mid: Hex32 | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: botMatchAbi,
          data: log.data as Hex,
          topics: log.topics,
        });
        if (decoded.eventName === "BotMatchStarted") {
          mid = decoded.args.matchId as Hex32;
          break;
        }
      } catch {
        // Not a BotMatchStarted log — try the next one.
      }
    }
    if (!mid) {
      setStartError("matchId not found in receipt");
      return;
    }
    setChainMatchId(mid);
    void startPveMatch(mid, difficulty, authedFetch).then(
      (r) => {
        setSeed(r.seed);
      },
      (e: unknown) => {
        const code = e instanceof PveApiError ? e.code : errMessage(e);
        setStartError(code);
        Sentry.captureException(e, { tags: { route: "POST /api/pve/start" } });
      },
    );
  }, [isMined, receipt, antiCheatEnabled, chainMatchId, difficulty, authedFetch]);

  async function handleDifficulty(d: Difficulty) {
    setDifficulty(d);
    if (!hasContract || !isConnected) {
      setStage("placement");
      return;
    }
    setStage("staking");
    try {
      const hash = await writeContractAsync({
        address: BOT_MATCH_ADDRESS as `0x${string}`,
        abi: botMatchAbi,
        functionName: "playBot",
        args: [d],
        value: parseEther(DIFFICULTY_ENTRY_FEE_ETH[d]),
      });
      setTxHash(hash);
      setStage("placement");
    } catch (_e) {
      // Surface error via the staking screen; user can retry or go back.
    }
  }

  /**
   * Settle the match on chain. Submits the move log to /api/pve/finish, and
   * (on success) calls `BotMatch.recordResult(matchId, won, signature)` so
   * the player's XP is credited. All errors are caught and surfaced as a
   * `chainStatus` badge in the result screen — local stats are already
   * recorded by the time we get here, so a failed claim never blocks the
   * user from seeing their result.
   */
  async function settleOnChain(won: boolean, stats: PveFinishStats, board: Board) {
    if (!antiCheatEnabled || !chainMatchId) {
      setChainStatus("skipped");
      return;
    }
    if (!seed) {
      // Start API never returned — server can't replay our match.
      setChainStatus("failed");
      setChainError(startError ?? "no_seed");
      return;
    }
    setChainStatus("pending");
    try {
      const userShips: PlacedShipWire[] = board.ships.map((s) => ({
        size: s.size,
        cells: s.cells.map((c) => [c[0], c[1]] as [number, number]),
      }));
      const { signature } = await finishPveMatch(
        { matchId: chainMatchId, won, userShips, moveLog: stats.moveLog },
        authedFetch,
      );
      await writeContractAsync({
        address: BOT_MATCH_ADDRESS as `0x${string}`,
        abi: botMatchAbi,
        functionName: "recordResult",
        args: [chainMatchId, won, signature as `0x${string}`],
      });
      setChainStatus("success");
    } catch (e: unknown) {
      const code = e instanceof PveApiError ? e.code : errMessage(e);
      setChainError(code);
      setChainStatus("failed");
      Sentry.captureException(e, {
        tags: { route: "settleOnChain" },
        extra: { matchId: chainMatchId },
      });
    }
  }

  function handleFinished(won: boolean, stats: PveFinishStats) {
    setResult({ won, playerShots: stats.playerShots, botShots: stats.botShots });
    const prev = loadStats(address);
    const priorTotalWins = prev.pveWins + prev.pvpWins;
    const next = recordMatch(address, { mode: "pve", won, difficulty });
    let winStreak = 0;
    for (const m of next.matches) {
      if (!m.won) break;
      winStreak++;
    }
    addProgress(address, "hundredMatches");
    addProgress(address, "fiveHundredMatches");
    if (won) {
      grantPveReward(address, true, difficulty, winStreak);
      markIf(address, "firstWin", priorTotalWins === 0);
      recordProgress(address, "tenWinStreak", winStreak);
      markIf(address, "ironFist", difficulty === 2 && !stats.powerupsUsed);
      markIf(address, "blindSeer", !stats.powerupsUsed);
      markIf(address, "quickDraw", stats.durationMs > 0 && stats.durationMs < 60_000);
      markIf(address, "silentHunter", stats.playerShots <= 25);
      markIf(address, "firstTryHard", difficulty === 2 && priorTotalWins === 0);
      markIf(address, "rankMatros", next.xp >= 100);
      markIf(address, "rankMichman", next.xp >= 1500);
      markIf(address, "rankLieutenant", next.xp >= 3000);
      markIf(address, "rankAdmiral", next.xp >= 20000);
      markIf(address, "richCaptain", loadCoins(address) >= 1000);
    } else {
      const lossStreak = currentLossStreak(next);
      if (lossStreak >= STREAK_THRESHOLD) {
        const prevXp = loadStats(address).xp;
        const penalty = lossStreakPenalty(prevXp);
        const xpNext = applyXpDelta(prevXp, -penalty);
        if (xpNext !== prevXp) {
          saveStats({ ...next, xp: xpNext }, address);
        }
      }
    }
    if (playerBoard) {
      void settleOnChain(won, stats, playerBoard);
    }
    setStage("result");
  }

  function handleRetry() {
    reset();
    setTxHash(undefined);
    setResult(null);
    setPlayerBoard(null);
    setChainMatchId(null);
    setSeed(null);
    setStartError(null);
    setChainStatus("idle");
    setChainError(null);
    startedFor.current = null;
    setStage("select");
  }

  if (stage === "select") {
    return <DifficultySelect onSelect={handleDifficulty} onBack={onExit} />;
  }

  if (stage === "staking") {
    return (
      <StatusCard title="Locking entry fee" tone={writeError ? "danger" : "default"}>
        <p className="text-sm text-sea-300">
          {DIFFICULTY_ENTRY_FEE_ETH[difficulty]} ETH → BotMatch ({DIFFICULTY_LABELS[difficulty]}).
          Approve the transaction in your wallet.
        </p>
        {isSigning && <p className="text-sm text-sea-300">Signing…</p>}
        {isMining && <p className="text-sm text-sea-300">Mining…</p>}
        {txHash && <TxLink hash={txHash} label="tx" />}
        {writeError && (
          <div className="space-y-3">
            <p className="text-sm text-red-300">{errMessage(writeError)}</p>
            <Button onClick={handleRetry}>Try another difficulty</Button>
          </div>
        )}
        <div className="pt-2">
          <BackLink onClick={onExit} />
        </div>
      </StatusCard>
    );
  }

  if (stage === "placement") {
    const showSeedPending = antiCheatEnabled && isMined && !seed && !startError;
    const showSeedError = antiCheatEnabled && Boolean(startError);
    return (
      <div className="space-y-4">
        {!hasContract && (
          <p className="mx-auto max-w-3xl rounded-lg border border-sea-700 bg-sea-900/60 px-4 py-2 text-xs text-sea-300">
            Offline demo mode — set <code>VITE_BOT_MATCH_ADDRESS</code> to enable on-chain entry fees.
          </p>
        )}
        {hasContract && !isConnected && (
          <div className="mx-auto max-w-3xl rounded-lg border border-sea-700 bg-sea-900/60 px-4 py-2 text-xs text-sea-300">
            Not connected — playing in demo mode.{" "}
            <button className="font-semibold text-sea-100 hover:underline" onClick={() => login()}>
              Connect wallet
            </button>{" "}
            to record XP on-chain.
          </div>
        )}
        {hasContract && isConnected && !session && (
          <div className="mx-auto max-w-3xl rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            Not signed in — sign in (top-right) so the server can verify the win and credit on-chain XP.
          </div>
        )}
        {showSeedPending && (
          <p className="mx-auto max-w-3xl rounded-lg border border-sea-700 bg-sea-900/60 px-4 py-2 text-xs text-sea-300">
            Connecting to anti-cheat server…
          </p>
        )}
        {showSeedError && (
          <p className="mx-auto max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            Anti-cheat unavailable ({startError}). You can still play, but XP won't post on chain.
          </p>
        )}
        {isMined && !showSeedPending && !showSeedError && (
          <p className="mx-auto max-w-3xl rounded-lg border border-sea-400/40 bg-sea-800/60 px-4 py-2 text-xs text-sea-200">
            Entry fee confirmed. Good hunting.
          </p>
        )}
        <ShipPlacement
          onReady={(b) => {
            setPlayerBoard(b);
            setStage("playing");
          }}
          onBack={() => setStage("select")}
        />
      </div>
    );
  }

  if (stage === "playing" && playerBoard) {
    return (
      <GameBoard
        difficulty={difficulty}
        playerBoard={playerBoard}
        onFinished={handleFinished}
        seed={seed}
      />
    );
  }

  if (stage === "result" && result) {
    return (
      <ResultScreen
        won={result.won}
        difficulty={difficulty}
        stats={{ playerShots: result.playerShots, botShots: result.botShots }}
        txHash={txHash}
        onPlayAgain={handleRetry}
        onHome={onExit}
        chainStatus={chainStatus}
        chainError={chainError}
      />
    );
  }

  return null;
}
