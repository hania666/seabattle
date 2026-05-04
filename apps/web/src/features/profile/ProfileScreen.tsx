import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { BackLink, Button, Card } from "../../components/ui";
import { shortAddress } from "../../lib/format";
import { rankForXp, RANKS, TONE_CLASSES } from "../../lib/ranks";
import {
  clearStats,
  describeMatch,
  loadStats,
  type PlayerStats,
} from "../../lib/stats";
import { useCoins } from "../../lib/coins";
import {
  DECAY_PER_WEEK,
  INACTIVITY_GRACE_MS,
  STREAK_THRESHOLD,
  currentLossStreak,
  daysUntilDecay,
  lossStreakPenalty,
} from "../../lib/rankDecay";
import { useT } from "../../lib/i18n";
import { AchievementGrid } from "./AchievementGrid";
import { ReferralLink } from "./ReferralLink";

interface Props {
  onExit: () => void;
  onPlayPvE: () => void;
  onPlayPvP: () => void;
}

export function ProfileScreen({ onExit, onPlayPvE, onPlayPvP }: Props) {
  const t = useT();
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const [stats, setStats] = useState<PlayerStats>(() => loadStats(address));
  const coins = useCoins(address);

  useEffect(() => {
    setStats(loadStats(address));
    function refresh() {
      setStats(loadStats(address));
    }
    window.addEventListener("stats:updated", refresh);
    return () => window.removeEventListener("stats:updated", refresh);
  }, [address]);

  const totalWins = stats.pveWins + stats.pvpWins;
  const totalLosses = stats.pveLosses + stats.pvpLosses;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches === 0 ? 0 : Math.round((totalWins / totalMatches) * 100);
  const progress = rankForXp(stats.xp);
  const rankTone = TONE_CLASSES[progress.rank.tone];

  const lossStreak = currentLossStreak(stats);
  const days = daysUntilDecay(stats);
  const graceDays = INACTIVITY_GRACE_MS / (24 * 60 * 60 * 1000);
  const nextPenalty = lossStreakPenalty(stats.xp);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sea-400">
            Profile
          </p>
          <h2 className="font-display text-3xl text-sea-50 sm:text-4xl">
            {isConnected && address ? shortAddress(address) : "Guest captain"}
          </h2>
          {isConnected ? (
            <p className="mt-1 text-xs text-sea-300">
              Abstract wallet connected · stats saved to this browser
            </p>
          ) : (
            <p className="mt-1 text-xs text-sea-300">
              Not connected — stats saved as "guest". Connect to track per-wallet.
            </p>
          )}
          {isConnected && address && <ReferralLink address={address} />}
        </div>
        {!isConnected && (
          <Button variant="primary" onClick={() => login()}>
            Connect Abstract Wallet
          </Button>
        )}
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ring-4 ${rankTone.bg} ${rankTone.ring}`}
            aria-hidden
          >
            <RankBadge className={`h-12 w-12 ${rankTone.text}`} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
              Current rank
            </div>
            <div className="font-display text-3xl font-bold text-sea-50">
              {t(progress.rank.labelKey)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-sea-300">
              <span className="text-gold-300">{stats.xp.toLocaleString()} XP</span>
              <span>· win rate {winRate}%</span>
              {progress.next && (
                <span className="text-sea-200/80">
                  · {progress.xpForNext - progress.xpIntoRank} XP to {t(progress.next.labelKey)}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-900/70 ring-1 ring-sea-700/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sea-300 via-gold-300 to-gold-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="XP" value={stats.xp} accent="sea" />
        <StatTile label={t("coins.label")} value={coins} accent="gold" />
        <StatTile label="Wins" value={totalWins} accent="sea" />
        <StatTile label="Losses" value={totalLosses} accent="coral" />
      </div>

      {(lossStreak >= STREAK_THRESHOLD - 1 || (days !== null && days < 7)) && (
        <section
          className="space-y-2 rounded-2xl border border-amber-600/30 bg-amber-900/20 p-4 text-xs text-amber-200"
          data-testid="decay-panel"
        >
          {lossStreak >= STREAK_THRESHOLD - 1 && (
            <p>
              {t("rank.decay.losing.streak", {
                n: lossStreak,
                penalty: nextPenalty,
              })}
            </p>
          )}
          {days !== null && days < 7 && (
            <p>
              {t("rank.decay.inactivity", {
                days: graceDays,
                per: DECAY_PER_WEEK,
              })}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
          Rank ladder
        </h3>
        <div className="flex flex-wrap gap-2">
          {RANKS.map((r) => {
            const active = r.key === progress.rank.key;
            const unlocked = stats.xp >= r.minXp;
            const tc = TONE_CLASSES[r.tone];
            return (
              <div
                key={r.key}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                  active
                    ? `${tc.bg} ${tc.text} ring-2 ${tc.ring} shadow-glow`
                    : unlocked
                      ? "bg-sea-900/70 text-sea-100 ring-sea-600/60"
                      : "bg-sea-950/60 text-sea-400/70 ring-sea-800/60"
                }`}
                title={`${t(r.labelKey)} · unlock at ${r.minXp.toLocaleString()} XP`}
              >
                <RankBadge className="h-3.5 w-3.5" />
                <span className="font-medium">{t(r.labelKey)}</span>
                <span className="text-[10px] opacity-75 tabular-nums">
                  {r.minXp.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <AchievementGrid address={address} />

      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          label="PvE"
          wins={stats.pveWins}
          losses={stats.pveLosses}
          cta="Play vs bot"
          onClick={onPlayPvE}
        />
        <ModeCard
          label="PvP"
          wins={stats.pvpWins}
          losses={stats.pvpLosses}
          cta="Find PvP match"
          onClick={onPlayPvP}
        />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg text-sea-100">Recent matches</h3>
          {stats.matches.length > 0 && (
            <button
              type="button"
              className="text-xs text-sea-400 hover:text-sea-200 hover:underline"
              onClick={() => {
                if (confirm("Clear local match history?")) {
                  clearStats(address);
                  setStats(loadStats(address));
                }
              }}
            >
              Clear history
            </button>
          )}
        </div>
        {stats.matches.length === 0 ? (
          <Card>
            <p className="text-sm text-sea-300">
              No matches yet. Start with the bot — Easy tier is a free warm-up.
            </p>
          </Card>
        ) : (
          <ul className="divide-y divide-sea-800/70 rounded-2xl border border-sea-800/60 bg-sea-950/40">
            {stats.matches.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-6 w-10 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                      m.won
                        ? "bg-sea-300/20 text-sea-200 ring-1 ring-sea-300/60"
                        : "bg-coral-500/20 text-coral-300 ring-1 ring-coral-400/50"
                    }`}
                  >
                    {m.won ? "Win" : "Loss"}
                  </span>
                  <span className="text-sea-100">{describeMatch(m)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-sea-400">
                  {m.xpGained > 0 && (
                    <span className="text-gold-300">+{m.xpGained} XP</span>
                  )}
                  <time dateTime={new Date(m.playedAt).toISOString()}>
                    {relativeTime(m.playedAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2">
        <BackLink onClick={onExit} label="Home" />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = "sea",
}: {
  label: string;
  value: number;
  accent?: "sea" | "gold" | "coral";
}) {
  const accentCls =
    accent === "gold"
      ? "text-gold-300"
      : accent === "coral"
        ? "text-coral-300"
        : "text-sea-50";
  return (
    <div className="rounded-2xl border border-sea-800/60 bg-sea-950/40 px-4 py-4 shadow-glow/0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sea-400">
        {label}
      </div>
      <div className={`mt-1 font-display text-3xl font-semibold ${accentCls}`}>{value}</div>
    </div>
  );
}

function ModeCard({
  label,
  wins,
  losses,
  cta,
  onClick,
}: {
  label: string;
  wins: number;
  losses: number;
  cta: string;
  onClick: () => void;
}) {
  const total = wins + losses;
  const rate = total === 0 ? 0 : Math.round((wins / total) * 100);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sea-400">
            {label}
          </div>
          <div className="font-display text-2xl text-sea-50">
            {wins} <span className="text-sea-500">W</span>
            <span className="mx-2 text-sea-700">·</span>
            {losses} <span className="text-sea-500">L</span>
          </div>
          <div className="text-xs text-sea-300">
            {total} matches · {rate}% win rate
          </div>
        </div>
        <Button variant="secondary" onClick={onClick}>
          {cta}
        </Button>
      </div>
    </Card>
  );
}

function RankBadge({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className}>
      <path d="M4 16 L20 4 L36 16 L20 28 Z" fill="currentColor" opacity="0.95" />
      <path d="M8 18 L20 10 L32 18 L20 26 Z" fill="currentColor" opacity="0.7" />
      <path d="M10 30 L30 30 L28 36 L12 36 Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
