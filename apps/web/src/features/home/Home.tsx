import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { loadStats, type PlayerStats } from "../../lib/stats";
import { rankForXp, TONE_CLASSES } from "../../lib/ranks";
import { sfx } from "../../lib/audio";
import { SubmarineArt, CarrierArt, SeagullArt, CompassArt } from "./HomeArt";

interface Props {
  onPvE: () => void;
  onPvP: () => void;
  onProfile: () => void;
  onLeaderboard: () => void;
}

export function Home({ onPvE, onPvP, onProfile, onLeaderboard }: Props) {
  const { address } = useAccount();
  const [stats, setStats] = useState<PlayerStats>(() => loadStats(address));

  useEffect(() => {
    setStats(loadStats(address));
    function refresh() {
      setStats(loadStats(address));
    }
    window.addEventListener("stats:updated", refresh);
    return () => window.removeEventListener("stats:updated", refresh);
  }, [address]);

  const progress = rankForXp(stats.xp);
  const tone = TONE_CLASSES[progress.rank.tone];

  return (
    <div className="relative mx-auto max-w-6xl space-y-12 py-2 sm:py-6">
      {/* Floating seagulls */}
      <div
        className="pointer-events-none absolute left-8 top-0 hidden animate-float-slow opacity-70 md:block"
        aria-hidden
      >
        <SeagullArt className="h-5 w-12 text-sea-100" />
      </div>
      <div
        className="pointer-events-none absolute right-20 top-10 hidden animate-float-reverse opacity-60 md:block"
        aria-hidden
      >
        <SeagullArt className="h-4 w-10 text-sea-100" />
      </div>

      {/* Hero row — submarine + title + carrier */}
      <section className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="hidden md:block" aria-hidden>
          <SubmarineArt className="h-40 w-full animate-float-medium" />
        </div>

        <div className="animate-fade-in flex flex-col items-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-sea-300">
            Pre-alpha · Abstract Testnet
          </p>
          <h1 className="mt-3 font-display text-5xl font-black leading-[0.95] text-sea-50 sm:text-7xl">
            <span className="inline-block animate-wiggle bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(250,204,21,0.25)]">
              SEA3
            </span>
            <br />
            <span className="bg-gradient-to-br from-sea-100 via-sea-300 to-sea-500 bg-clip-text text-transparent">
              BATTLE
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-sea-100/90 sm:text-base">
            Stake, play, claim. Winner takes{" "}
            <strong className="text-gold-300">95 %</strong> of the pot on-chain.
            PvE mode is practically free — just gas, beat bots, climb from Юнга to Адмирал.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCTA onClick={() => { sfx.click(); onPvE(); }} data-testid="home-pve">
              ENTER BATTLE
            </PrimaryCTA>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <ChipButton onClick={() => { sfx.click(); onPvP(); }} data-testid="home-pvp">
              PvP arena
            </ChipButton>
            <ChipButton onClick={() => { sfx.click(); onLeaderboard(); }} data-testid="home-leaderboard">
              Leaderboard
            </ChipButton>
            <ChipButton onClick={() => { sfx.click(); onProfile(); }} data-testid="home-profile">
              Profile
            </ChipButton>
          </div>
        </div>

        <div className="hidden md:block" aria-hidden>
          <CarrierArt className="h-40 w-full animate-float-slow" />
        </div>
      </section>

      {/* Current rank strip */}
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-sea-500/40 bg-sea-900/60 p-4 shadow-glow backdrop-blur">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-4 ${tone.bg} ${tone.ring}`}
              aria-hidden
            >
              <RankInsignia className={`h-9 w-9 ${tone.text}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-sea-300">Your rank</div>
                  <div className="font-display text-2xl font-bold text-sea-50">
                    {progress.rank.label}
                  </div>
                </div>
                <div className="text-right text-sm text-sea-200">
                  <div className="font-semibold text-gold-300">{stats.xp.toLocaleString()} XP</div>
                  {progress.next && (
                    <div className="text-[11px] text-sea-300/80">
                      {progress.xpForNext - progress.xpIntoRank} to {progress.next.label}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-950/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sea-300 via-gold-300 to-gold-500 transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mode tiles */}
      <section className="grid gap-4 md:grid-cols-3">
        <ModeTile
          title="PLAY vs BOT"
          subtitle="Free XP, dust fee"
          description="Easy is free. Normal/Hard cost pennies of testnet ETH. Sink the bot, rack up XP, rank up."
          cta="PLAY"
          tone="sea"
          stat={`${stats.pveWins}W · ${stats.pveLosses}L`}
          onClick={() => { sfx.click(); onPvE(); }}
        />
        <ModeTile
          title="PvP ARENA"
          subtitle="Stake · play · claim"
          description="Pick a stake from 0.001 to 0.01 ETH. Winner claims 95 % of the pot with one transaction."
          cta="HOST / JOIN"
          tone="gold"
          highlight
          stat={`${stats.pvpWins}W · ${stats.pvpLosses}L`}
          onClick={() => { sfx.click(); onPvP(); }}
        />
        <ModeTile
          title="LEADERBOARD"
          subtitle="Global ranks"
          description="Top captains ranked by XP. Your spot updates after every match. Daily & all-time boards."
          cta="VIEW"
          tone="coral"
          stat={`${stats.xp.toLocaleString()} XP`}
          onClick={() => { sfx.click(); onLeaderboard(); }}
        />
      </section>

      {/* Info strip */}
      <section className="relative overflow-hidden rounded-2xl border border-sea-800/60 bg-sea-950/50 px-5 py-4">
        <div className="absolute left-3 top-1/2 hidden -translate-y-1/2 sm:block" aria-hidden>
          <CompassArt className="h-16 w-16 animate-spin-slow opacity-80" />
        </div>
        <div className="flex overflow-hidden sm:pl-24">
          <div className="flex shrink-0 animate-marquee items-center gap-10 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] text-sea-200/90">
            <span>• ON-CHAIN STAKES •</span>
            <span className="text-gold-300">• ECDSA SIGNED RESULTS •</span>
            <span>• 95 % TO WINNER •</span>
            <span className="text-coral-300">• ЮНГА → АДМИРАЛ •</span>
            <span>• TESTNET FIRST •</span>
            <span className="text-gold-300">• ON-CHAIN STAKES •</span>
            <span>• ECDSA SIGNED RESULTS •</span>
            <span className="text-coral-300">• 95 % TO WINNER •</span>
            <span>• ЮНГА → АДМИРАЛ •</span>
            <span className="text-gold-300">• TESTNET FIRST •</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function PrimaryCTA({
  onClick,
  children,
  ...rest
}: {
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 px-8 py-4 font-display text-xl font-black uppercase tracking-wide text-sea-950 shadow-arcade transition hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(250,204,21,0.7)] focus:outline-none focus:ring-4 focus:ring-gold-300/50 active:scale-[0.98]"
      {...rest}
    >
      <span className="relative z-10 flex items-center gap-3">
        <FireIcon />
        {children}
        <FireIcon />
      </span>
      <span
        className="pointer-events-none absolute inset-y-0 -inset-x-4 flex -skew-x-12 animate-shimmer"
        aria-hidden
      >
        <span className="h-full w-12 bg-white/40 blur-md" />
      </span>
    </button>
  );
}

function ChipButton({
  onClick,
  children,
  ...rest
}: {
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-sea-500/50 bg-sea-900/60 px-4 py-2 font-semibold text-sea-100 transition hover:border-sea-300 hover:bg-sea-800/80 focus:outline-none focus:ring-2 focus:ring-sea-300/50"
      {...rest}
    >
      {children}
    </button>
  );
}

function ModeTile({
  title,
  subtitle,
  description,
  cta,
  tone,
  highlight,
  stat,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tone: "sea" | "gold" | "coral";
  highlight?: boolean;
  stat: string;
  onClick: () => void;
}) {
  const toneClasses = {
    sea: {
      frame: "border-sea-400/60",
      pill: "bg-sea-500 text-sea-950",
      ctaBg: "bg-gradient-to-br from-sea-300 to-sea-500 text-sea-950",
    },
    gold: {
      frame: "border-gold-400/70",
      pill: "bg-gold-400 text-sea-950",
      ctaBg: "bg-gradient-to-br from-gold-300 to-gold-600 text-sea-950",
    },
    coral: {
      frame: "border-coral-400/60",
      pill: "bg-coral-400 text-sea-950",
      ctaBg: "bg-gradient-to-br from-coral-300 to-coral-500 text-sea-950",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border-2 bg-arcade-tile p-5 text-left transition hover:-translate-y-1 hover:shadow-glow focus:outline-none focus:ring-4 focus:ring-sea-300/30 ${toneClasses.frame} ${
        highlight ? "animate-pulse-glow" : ""
      }`}
    >
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${toneClasses.pill}`}
      >
        {subtitle}
      </span>
      <h3 className="font-display text-2xl font-black text-sea-50 drop-shadow">{title}</h3>
      <p className="text-sm text-sea-100/85">{description}</p>
      <div className="mt-auto flex w-full items-center justify-between pt-3">
        <span className="rounded-md bg-sea-950/60 px-2 py-1 text-[11px] font-mono text-sea-200 ring-1 ring-sea-700/60">
          {stat}
        </span>
        <span
          className={`rounded-xl px-4 py-1.5 text-sm font-bold uppercase tracking-wider transition group-hover:scale-105 ${toneClasses.ctaBg}`}
        >
          {cta} →
        </span>
      </div>
    </button>
  );
}

function FireIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5">
      <path
        d="M10 2c1 3-1 4-1 6s2 1 2 3-2 3-3 3c-2 0-4-1.8-4-4 0-1 .5-1.5 1-2 0 1 1 1 1 0 0-2 1-4 4-6z"
        fill="#7c2d12"
      />
      <path
        d="M10 3c0 2-1.5 3.5-1.5 5 0 .8.5 1.2 1 1.2 1 0 1.5-.5 1.5-1.5 1 .8 2 1.8 2 3.3 0 1.8-1.2 3-3 3-1.5 0-2.5-1-2.5-2.3 0-.7.3-1 .8-1.3-.5 2 1.3 2.3 1.8 1.2.5-1.2-.7-1.7-.7-3 0-2 .8-3.5 2.6-5.6z"
        fill="#f97316"
      />
    </svg>
  );
}

function RankInsignia({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className}>
      <path d="M4 16 L20 4 L36 16 L20 28 Z" fill="currentColor" opacity="0.95" />
      <path d="M8 18 L20 10 L32 18 L20 26 Z" fill="currentColor" opacity="0.7" />
      <path d="M10 30 L30 30 L28 36 L12 36 Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
