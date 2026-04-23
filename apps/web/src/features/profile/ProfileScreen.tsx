import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { BackLink, Button, Card } from "../../components/ui";
import { shortAddress } from "../../lib/format";
import {
  clearStats,
  describeMatch,
  loadStats,
  type PlayerStats,
} from "../../lib/stats";

interface Props {
  onExit: () => void;
  onPlayPvE: () => void;
  onPlayPvP: () => void;
}

export function ProfileScreen({ onExit, onPlayPvE, onPlayPvP }: Props) {
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const [stats, setStats] = useState<PlayerStats>(() => loadStats(address));

  useEffect(() => {
    setStats(loadStats(address));
  }, [address]);

  const totalWins = stats.pveWins + stats.pvpWins;
  const totalLosses = stats.pveLosses + stats.pvpLosses;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches === 0 ? 0 : Math.round((totalWins / totalMatches) * 100);
  // XP needed for next level grows every 500 XP. Pure cosmetic progress bar.
  const level = Math.floor(stats.xp / 500) + 1;
  const levelXp = stats.xp % 500;
  const levelPct = Math.min(100, Math.round((levelXp / 500) * 100));

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
        </div>
        {!isConnected && (
          <Button variant="primary" onClick={() => login()}>
            Connect Abstract Wallet
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Level" value={level} accent="gold" />
        <StatTile label="XP" value={stats.xp} />
        <StatTile label="Wins" value={totalWins} accent="sea" />
        <StatTile label="Losses" value={totalLosses} accent="coral" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-sea-400">Level progress</div>
          <div className="text-xs text-sea-300">
            {levelXp}/500 XP · win rate {winRate}%
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-900/70 ring-1 ring-sea-700/60">
          <div
            className="h-full bg-gradient-to-r from-gold-400 to-gold-500 shadow-glow-gold"
            style={{ width: `${levelPct}%` }}
          />
        </div>
      </Card>

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
