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
import { GameBoard } from "./GameBoard";
import { ResultScreen } from "./ResultScreen";

type Stage = "select" | "staking" | "placement" | "playing" | "result";

export function PveScreen({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<Stage>("select");
  const [difficulty, setDifficulty] = useState<Difficulty>(0);
  const [playerBoard, setPlayerBoard] = useState<Board | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [result, setResult] = useState<{ won: boolean; playerShots: number; botShots: number } | null>(null);

  const { isConnected } = useAccount();
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

  function handleFinished(won: boolean, stats: { playerShots: number; botShots: number }) {
    setResult({ won, ...stats });
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
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h2 className="font-display text-2xl text-sea-50">Locking entry fee</h2>
        <p className="text-sm text-sea-300">
          {DIFFICULTY_ENTRY_FEE_ETH[difficulty]} ETH → BotMatch ({DIFFICULTY_LABELS[difficulty]}).
          Approve the transaction in your wallet.
        </p>
        {isSigning && <p className="text-sm text-sea-300">Signing…</p>}
        {isMining && <p className="text-sm text-sea-300">Mining…</p>}
        {txHash && (
          <p className="text-xs text-sea-400">
            Tx: <span className="font-mono">{txHash.slice(0, 12)}…</span>
          </p>
        )}
        {writeError && (
          <div className="space-y-3">
            <p className="text-sm text-red-300">{writeError.message}</p>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-sea-300 px-4 py-2 text-sm font-semibold text-sea-950 hover:bg-sea-200"
            >
              Try another difficulty
            </button>
          </div>
        )}
      </div>
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
