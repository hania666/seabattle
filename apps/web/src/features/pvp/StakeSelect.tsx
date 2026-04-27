import { useState } from "react";
import { STAKE_OPTIONS, type StakeOption } from "../../lib/pvp/stakes";
import { Button } from "../../components/ui";
import { useT } from "../../lib/i18n";

export type PvpMode = "classic" | "arcade";

interface Props {
  onStart: (mode: "host" | "join", stake: StakeOption, pvpMode: PvpMode) => void;
  onBack: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function StakeSelect({ onStart, onBack, disabled, disabledReason }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<string>(STAKE_OPTIONS[1].id);
  const [pvpMode, setPvpMode] = useState<PvpMode>("classic");
  // STAKE_OPTIONS is a closed enum and `selected` is always one of its ids;
  // the find can't actually be undefined, but we narrow defensively rather
  // than asserting it away.
  const stake = STAKE_OPTIONS.find((o) => o.id === selected) ?? STAKE_OPTIONS[0];

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

      <section className="space-y-2" aria-labelledby="pvp-mode-heading">
        <h3
          id="pvp-mode-heading"
          className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-sea-400"
        >
          {t("pvp.mode.title")}
        </h3>
        <div
          className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label={t("pvp.mode.title")}
        >
          <ModeCard
            active={pvpMode === "classic"}
            onSelect={() => setPvpMode("classic")}
            title={t("pvp.mode.classic.name")}
            desc={t("pvp.mode.classic.desc")}
            badge={t("pvp.mode.classic.badge")}
            testid="pvp-mode-classic"
          />
          <ModeCard
            active={pvpMode === "arcade"}
            onSelect={() => setPvpMode("arcade")}
            title={t("pvp.mode.arcade.name")}
            desc={t("pvp.mode.arcade.desc")}
            badge={t("pvp.mode.arcade.badge")}
            testid="pvp-mode-arcade"
            soon
          />
        </div>
      </section>

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
          onClick={() => onStart("host", stake, pvpMode)}
          disabled={disabled}
          data-testid="host-button"
        >
          Host lobby · stake {stake.eth} ETH
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onStart("join", stake, pvpMode)}
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

interface ModeCardProps {
  active: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  badge: string;
  testid: string;
  soon?: boolean;
}

function ModeCard({ active, onSelect, title, desc, badge, testid, soon }: ModeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={soon || undefined}
      disabled={soon}
      onClick={soon ? undefined : onSelect}
      data-testid={testid}
      className={`relative rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300 ${
        soon
          ? "cursor-not-allowed border-sea-700/40 bg-sea-900/40 opacity-60"
          : active
            ? "border-gold-400/70 bg-sea-800 shadow-glow-gold"
            : "border-sea-700/60 bg-sea-900/60 hover:border-sea-500"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg text-sea-50">{title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            soon
              ? "bg-amber-900/60 text-amber-200 ring-1 ring-amber-500/40"
              : "bg-sea-700/60 text-sea-100 ring-1 ring-sea-400/40"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-1 text-xs text-sea-300">{desc}</p>
    </button>
  );
}
