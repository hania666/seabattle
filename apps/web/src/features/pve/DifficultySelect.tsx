import type { Difficulty } from "../../lib/game/types";
import { DIFFICULTY_ENTRY_FEE_ETH, DIFFICULTY_LABELS, DIFFICULTY_XP } from "../../lib/game/types";

const OPTIONS: { value: Difficulty; blurb: string }[] = [
  { value: 0, blurb: "Bot fires at random. Great for warming up." },
  { value: 1, blurb: "Bot chases after hits on a checkerboard pattern." },
  { value: 2, blurb: "Bot prioritises high-probability cells. Sharp." },
];

interface Props {
  onSelect: (difficulty: Difficulty) => void;
  onBack?: () => void;
}

export function DifficultySelect({ onSelect, onBack }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2 text-center">
        <h2 className="font-display text-3xl text-sea-50 sm:text-4xl">Pick a bot</h2>
        <p className="text-sm text-sea-300">
          PvE matches pay a micro-stake and award Abstract XP. Stakes are the platform's cut; win or lose,
          you earn XP on a win.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3" data-testid="difficulty-list">
        {OPTIONS.map(({ value, blurb }) => (
          <li key={value}>
            <button
              data-testid={`difficulty-${value}`}
              onClick={() => onSelect(value)}
              className="group flex h-full w-full flex-col items-start gap-3 rounded-2xl border border-sea-700/60 bg-sea-900/60 p-5 text-left transition hover:border-sea-400 hover:bg-sea-800/80"
            >
              <span className="rounded-full bg-sea-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sea-100">
                {DIFFICULTY_LABELS[value]}
              </span>
              <span className="font-display text-2xl text-sea-50">
                {DIFFICULTY_ENTRY_FEE_ETH[value]} ETH
              </span>
              <span className="text-sm text-sea-300">{blurb}</span>
              <span className="mt-auto text-xs text-sea-400">
                Win reward: <strong className="text-sea-200">+{DIFFICULTY_XP[value]} XP</strong>
                {value === 0 && " · +25 daily bonus"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {onBack && (
        <div className="text-center">
          <button
            onClick={onBack}
            className="text-sm text-sea-400 underline-offset-4 hover:text-sea-200 hover:underline"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
