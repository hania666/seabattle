import { useState } from "react";
import { STAKE_OPTIONS, type StakeOption } from "../../lib/pvp/stakes";
import { Button } from "../../components/ui";

interface Props {
  onStart: (mode: "host" | "join", stake: StakeOption) => void;
  onBack: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function StakeSelect({ onStart, onBack, disabled, disabledReason }: Props) {
  const [selected, setSelected] = useState<string>(STAKE_OPTIONS[1].id);
  const stake = STAKE_OPTIONS.find((o) => o.id === selected)!;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2 text-center">
        <h2 className="font-display text-3xl text-sea-50 sm:text-4xl">PvP arena</h2>
        <p className="mx-auto max-w-xl text-sm text-sea-300">
          Pick a stake, then host your own lobby or join a random one. Winner gets{" "}
          <strong className="text-sea-100">95 %</strong> of the pot.
        </p>
        {disabled && disabledReason && (
          <p className="mx-auto max-w-md rounded-lg border border-amber-600/40 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
            {disabledReason}
          </p>
        )}
      </header>

      <ul className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Stake amount">
        {STAKE_OPTIONS.map((opt) => {
          const active = opt.id === selected;
          return (
            <li key={opt.id}>
              <button
                onClick={() => setSelected(opt.id)}
                data-testid={`stake-${opt.id}`}
                role="radio"
                aria-checked={active}
                className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300 ${
                  active
                    ? "border-sea-300 bg-sea-800"
                    : "border-sea-700/60 bg-sea-900/60 hover:border-sea-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sea-300">
                    {opt.label}
                  </span>
                  <span className="font-display text-xl text-sea-50">{opt.eth} ETH</span>
                </div>
                <p className="mt-2 text-xs text-sea-400">{opt.description}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => onStart("host", stake)}
          disabled={disabled}
          data-testid="host-button"
        >
          Host lobby · stake {stake.eth} ETH
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onStart("join", stake)}
          disabled={disabled}
          data-testid="join-button"
        >
          Find random · stake {stake.eth} ETH
        </Button>
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
      </div>

      <p className="text-center text-xs text-sea-500">
        You will lock {stake.eth} ETH on-chain via Abstract wallet. Refunds via{" "}
        <code>claimTimeout</code> if the opponent vanishes.
      </p>
    </div>
  );
}
