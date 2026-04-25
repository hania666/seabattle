import { useState } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
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

type Stage = "select" | "staking" | "placement" | "playing" | "result";

export function PveScreen({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<Stage>("select");
  const [difficulty, setDifficulty] = useState<Difficulty>(0);
  const [playerBoard, setPlayerBoard] = useState<Board | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [result, setResult] = useState<{ won: boolean; playerShots: number; botShots: number } | null>(null);

  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { writeContractAsync, isPending: isSigning, error: writeError, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash });

  const hasContract = Boolean(BOT_MATCH_ADDRESS);

  async function handleDifficulty(d: Difficulty) {
    setDifficulty(d);
    // Skip chain if no contract deployed yet or wallet not connected — demo mode.
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
      // Proceed to placement while the tx mines.
      setStage("placement");
    } catch (_e) {
      // Surface error via the staking screen; user can retry or go back.
    }
  }

  function handleFinished(won: boolean, stats: PveFinishStats) {
    setResult({ won, playerShots: stats.playerShots, botShots: stats.botShots });
    const prev = loadStats(address);
    const priorTotalWins = prev.pveWins + prev.pvpWins;
    const next = recordMatch(address, { mode: "pve", won, difficulty });
    // Win streak = most recent consecutive wins (inverse of loss streak).
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
      // On a loss, check if we just crossed the loss-streak threshold and
      // apply a rank-scaled XP penalty. Skipped while in grace (stats.xp < FLOOR).
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
    setStage("result");
  }

  function handleRetry() {
    reset();
    setTxHash(undefined);
    setResult(null);
    setPlayerBoard(null);
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
        {isMined && (
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
      <GameBoard difficulty={difficulty} playerBoard={playerBoard} onFinished={handleFinished} />
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
      />
    );
  }

  return null;
}
