import type { Difficulty } from "../../lib/game/types";
import { DIFFICULTY_LABELS, DIFFICULTY_XP } from "../../lib/game/types";

interface Props {
  won: boolean;
  difficulty: Difficulty;
  stats: { playerShots: number; botShots: number };
  txHash?: `0x${string}`;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function ResultScreen({ won, difficulty, stats, txHash, onPlayAgain, onHome }: Props) {
  const xp = won ? DIFFICULTY_XP[difficulty] : 0;
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div
        className={`inline-block rounded-3xl px-8 py-10 ${
          won ? "bg-sea-300 text-sea-950" : "bg-sea-800 text-sea-100"
        }`}
        data-testid="result-banner"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">
          {won ? "Victory" : "Defeat"}
        </p>
        <h2 className="font-display text-4xl">
          {won ? "All enemy ships sunk" : "Your fleet is gone"}
        </h2>
      </div>

      <ul className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Difficulty" value={DIFFICULTY_LABELS[difficulty]} />
        <Stat label="XP earned" value={won ? `+${xp}` : "0"} />
        <Stat label="Your shots" value={String(stats.playerShots)} />
        <Stat label="Bot shots" value={String(stats.botShots)} />
      </ul>

      {txHash && (
        <p className="text-xs text-sea-400">
          Entry tx:{" "}
          <a
            href={`https://sepolia.abscan.org/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sea-200 underline-offset-4 hover:underline"
          >
            {txHash.slice(0, 10)}…{txHash.slice(-6)}
          </a>
        </p>
      )}

      <div className="flex justify-center gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-sea-300 px-5 py-2 text-sm font-semibold text-sea-950 hover:bg-sea-200"
        >
          Play again
        </button>
        <button
          onClick={onHome}
          className="rounded-lg border border-sea-700 px-5 py-2 text-sm font-semibold text-sea-200 hover:bg-sea-800"
        >
          Home
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-lg border border-sea-700/60 bg-sea-900/60 px-3 py-3 text-left">
      <div className="text-[11px] uppercase tracking-wide text-sea-400">{label}</div>
      <div className="font-display text-xl text-sea-100">{value}</div>
    </li>
  );
}
