import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { loadStats, type PlayerStats } from "../../lib/stats";
import { rankForXp, TONE_CLASSES } from "../../lib/ranks";
import { sfx } from "../../lib/audio";
import { useT } from "../../lib/i18n";
import {
  SubmarineArt,
  CarrierArt,
  SeagullArt,
  CompassArt,
  WarSceneArt,
  PlaneArt,
  TorpedoArt,
} from "./HomeArt";

interface Props {
  onPvE: () => void;
  onPvP: () => void;
  onProfile: () => void;
  onLeaderboard: () => void;
}

export function Home({ onPvE, onPvP, onProfile, onLeaderboard }: Props) {
  const t = useT();
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

      {/* Biplane cruising across the top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-2 hidden h-10 overflow-hidden md:block"
        aria-hidden
      >
        <div className="h-full animate-plane-fly">
          <PlaneArt className="h-10 w-28 opacity-80" />
        </div>
      </div>

      {/* Hero row — submarine + title + carrier */}
      <section className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="relative hidden md:block" aria-hidden>
          <SubmarineArt className="h-40 w-full animate-float-medium" />
          {/* Torpedo trail from submarine */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-5 overflow-hidden md:block">
            <div className="h-full animate-torpedo-sail">
              <TorpedoArt className="h-5 w-20 opacity-85" />
            </div>
          </div>
        </div>

        <div className="animate-fade-in flex flex-col items-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-sea-300">
            {t("brand.era")}
          </p>
          <h1 className="mt-3 font-display text-5xl font-black leading-[0.95] text-sea-50 sm:text-7xl">
            <span className="inline-block animate-wiggle bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(250,204,21,0.25)]">
              {t("home.title1")}
            </span>
            <br />
            <span className="bg-gradient-to-br from-sea-100 via-sea-300 to-sea-500 bg-clip-text text-transparent">
              {t("home.title2")}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-sea-100/90 sm:text-base">
            {t("home.pitch", { pct: "95 %" })}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCTA
              onClick={() => {
                sfx.click();
                onPvE();
              }}
              data-testid="home-pve"
            >
              {t("home.cta.enter")}
            </PrimaryCTA>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <ChipButton
              onClick={() => {
                sfx.click();
                onPvP();
              }}
              data-testid="home-pvp"
            >
              {t("nav.pvp")}
            </ChipButton>
            <ChipButton
              onClick={() => {
                sfx.click();
                onLeaderboard();
              }}
              data-testid="home-leaderboard"
            >
              {t("nav.leaderboard")}
            </ChipButton>
            <ChipButton
              onClick={() => {
                sfx.click();
                onProfile();
              }}
              data-testid="home-profile"
            >
              {t("nav.profile")}
            </ChipButton>
          </div>
        </div>

        <div className="hidden md:block" aria-hidden>
          <CarrierArt className="h-40 w-full animate-float-slow" />
        </div>
      </section>

      {/* Live war scene (spans full width under hero) */}
      <section className="relative overflow-hidden rounded-2xl border border-sea-800/60 bg-sea-950/40 px-3 py-2">
        <WarSceneArt className="h-28 w-full sm:h-36" />
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
                  <div className="text-xs uppercase tracking-widest text-sea-300">
                    {t("home.yourRank")}
                  </div>
                  <div className="font-display text-2xl font-bold text-sea-50">
                    {progress.rank.label}
                  </div>
                </div>
                <div className="text-right text-sm text-sea-200">
                  <div className="font-semibold text-gold-300">
                    {stats.xp.toLocaleString()} XP
                  </div>
                  {progress.next && (
                    <div className="text-[11px] text-sea-300/80">
                      {t("home.xpTo", {
                        n: progress.xpForNext - progress.xpIntoRank,
                        rank: progress.next.label,
                      })}
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
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ModeTile
          title={t("home.tile.pve.title")}
          subtitle={t("home.tile.pve.sub")}
          description={t("home.tile.pve.desc")}
          cta={t("home.tile.pve.cta")}
          tone="sea"
          stat={`${stats.pveWins}W · ${stats.pveLosses}L`}
          onClick={() => {
            sfx.click();
            onPvE();
          }}
        />
        <ModeTile
          title={t("home.tile.pvp.title")}
          subtitle={t("home.tile.pvp.sub")}
          description={t("home.tile.pvp.desc")}
          cta={t("home.tile.pvp.cta")}
          tone="gold"
          highlight
          stat={`${stats.pvpWins}W · ${stats.pvpLosses}L`}
          onClick={() => {
            sfx.click();
            onPvP();
          }}
        />
        <ModeTile
          title={t("home.tile.profile.title")}
          subtitle={t("home.tile.profile.sub")}
          description={t("home.tile.profile.desc")}
          cta={t("home.tile.profile.cta")}
          tone="coral"
          stat={`${stats.xp.toLocaleString()} XP`}
          onClick={() => {
            sfx.click();
            onProfile();
          }}
        />
        <ModeTile
          title={t("home.tile.leaderboard.title")}
          subtitle={t("home.tile.leaderboard.sub")}
          description={t("home.tile.leaderboard.desc")}
          cta={t("home.tile.leaderboard.cta")}
          tone="sea"
          stat={`${stats.xp.toLocaleString()} XP`}
          onClick={() => {
            sfx.click();
            onLeaderboard();
          }}
        />
      </section>

      {/* Info strip */}
      <section className="relative overflow-hidden rounded-2xl border border-sea-800/60 bg-sea-950/50 px-5 py-4">
        <div
          className="absolute left-3 top-1/2 hidden -translate-y-1/2 sm:block"
          aria-hidden
        >
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
      cta: "bg-gradient-to-br from-sea-300 to-sea-500 text-sea-950 hover:shadow-glow",
    },
    gold: {
      frame: "border-gold-400/70",
      cta: "bg-gradient-to-br from-gold-300 to-gold-500 text-sea-950 hover:shadow-glow-gold",
    },
    coral: {
      frame: "border-coral-400/60",
      cta: "bg-gradient-to-br from-coral-400 to-coral-500 text-sea-950 hover:shadow-glow-coral",
    },
  } as const;
  const cls = toneClasses[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-2 rounded-2xl border bg-arcade-tile p-5 text-left transition hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-sea-300/40 ${cls.frame} ${
        highlight ? "animate-pulse-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sea-300">
            {subtitle}
          </div>
          <div className="font-display text-xl font-bold text-sea-50">{title}</div>
        </div>
        <span className="rounded-full bg-sea-950/70 px-2 py-0.5 text-[11px] font-semibold text-sea-200">
          {stat}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-sea-200/90">{description}</p>
      <span
        className={`mt-auto inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${cls.cta}`}
      >
        {cta} →
      </span>
    </button>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-6 w-6 drop-shadow">
      <path
        d="M10 1c1 3 5 5 5 9a5 5 0 01-10 0c0-1 .5-2.2 1.5-3 .3 1 .7 1.5 1.5 2 0-2 0-4 2-8z"
        fill="#b91c1c"
      />
      <path d="M10 6c.5 2 2.5 3 2.5 5a2.5 2.5 0 11-5 0c0-.5.3-1 .8-1.5.2.5.4.8.7 1 0-1 0-2 1-4.5z" fill="#fbbf24" />
    </svg>
  );
}

function RankInsignia({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className} fill="currentColor">
      <path d="M16 3l3.5 6.5 7 1L21 15.5l1.2 7L16 19l-6.2 3.5L11 15.5 5.5 10.5l7-1L16 3z" />
      <rect x="13" y="20" width="6" height="9" rx="1.5" />
    </svg>
  );
}
