import { useState } from "react";
import { STAKE_OPTIONS, type StakeOption } from "../../lib/pvp/stakes";

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
        <p className="text-sm text-sea-300">
          Pick a stake, then host your own lobby or join a random one. Winner gets 95 % of the pot.
        </p>
        {disabled && disabledReason && (
          <p className="mx-auto max-w-md rounded-lg border border-amber-600/40 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
            {disabledReason}
          </p>
        )}
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {STAKE_OPTIONS.map((opt) => {
          const active = opt.id === selected;
          return (
            <li key={opt.id}>
              <button
                onClick={() => setSelected(opt.id)}
                data-testid={`stake-${opt.id}`}
                className={`w-full rounded-2xl border p-4 text-left transition ${
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
        <button
          onClick={() => onStart("host", stake)}
          disabled={disabled}
          data-testid="host-button"
          className="rounded-lg bg-sea-300 px-6 py-3 text-sm font-semibold text-sea-950 transition hover:bg-sea-200 disabled:cursor-not-allowed disabled:bg-sea-700 disabled:text-sea-400"
        >
          Host lobby · stake {stake.eth} ETH
        </button>
        <button
          onClick={() => onStart("join", stake)}
          disabled={disabled}
          data-testid="join-button"
          className="rounded-lg border border-sea-400 px-6 py-3 text-sm font-semibold text-sea-100 hover:bg-sea-400/10 disabled:cursor-not-allowed disabled:border-sea-700 disabled:text-sea-500"
        >
          Find random · stake {stake.eth} ETH
        </button>
        <button
          onClick={onBack}
          className="rounded-lg border border-sea-700 px-4 py-3 text-sm font-semibold text-sea-200 hover:bg-sea-800"
        >
          Back
        </button>
      </div>

      <p className="text-center text-xs text-sea-500">
        You will lock {stake.eth} ETH on-chain via Abstract wallet. Refunds via{" "}
        <code>claimTimeout</code> if the opponent vanishes.
      </p>
    </div>
  );
}
