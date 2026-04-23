import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { loadStats, type PlayerStats } from "../lib/stats";
import { rankForXp, TONE_CLASSES } from "../lib/ranks";

/**
 * Compact top-right readout — rank badge, XP coin, wins counter. Reads the
 * local stats store and re-renders whenever the wallet address changes or a
 * `stats:updated` window event fires (dispatched by features after a match).
 */
export function Hud() {
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
  const wins = stats.pveWins + stats.pvpWins;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-2 ring-inset ${tone.bg} ${tone.ring} ${tone.text}`}
        title={`${progress.rank.label} · ${stats.xp.toLocaleString()} XP`}
      >
        <RankChevron />
        <span className="hidden sm:inline">{progress.rank.label}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-sea-950/70 px-3 py-1.5 text-xs font-semibold text-gold-300 ring-1 ring-gold-400/40">
        <CoinIcon />
        <span className="tabular-nums">{stats.xp.toLocaleString()}</span>
      </div>
      <div className="hidden items-center gap-1.5 rounded-full bg-sea-950/70 px-3 py-1.5 text-xs font-semibold text-coral-300 ring-1 ring-coral-400/40 sm:flex">
        <TrophyIcon />
        <span className="tabular-nums">{wins}</span>
      </div>
    </div>
  );
}

function RankChevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path d="M2 11l6-6 6 6-1.5 1.5L8 8l-4.5 4.5z" fill="currentColor" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
      <circle cx="10" cy="10" r="8" fill="#fbbf24" />
      <circle cx="10" cy="10" r="6" fill="#fcd34d" />
      <path d="M10 5v10M7 8h6M7 12h6" stroke="#b45309" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="M5 3h10v4a5 5 0 11-10 0V3zM7 15h6v2H7zM9 13h2v2H9z"
        fill="currentColor"
      />
    </svg>
  );
}
