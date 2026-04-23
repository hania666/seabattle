/**
 * Player rank ladder (naval titles). Ranks are purely a UI concept derived
 * from the XP total stored in stats.ts. Thresholds were chosen so early
 * progression feels fast and the top tier remains aspirational.
 */

export interface Rank {
  /** Internal key — English, used for icons/colors. */
  key: string;
  /** Display label — Russian, matching the brief. */
  label: string;
  /** Inclusive XP threshold to reach this rank. */
  minXp: number;
  /** Tailwind tone for badges. */
  tone: "slate" | "sea" | "teal" | "gold" | "coral" | "violet";
}

export const RANKS: Rank[] = [
  { key: "cabin-boy", label: "Юнга", minXp: 0, tone: "slate" },
  { key: "sailor", label: "Матрос", minXp: 100, tone: "sea" },
  { key: "bosun", label: "Боцман", minXp: 500, tone: "teal" },
  { key: "midshipman", label: "Мичман", minXp: 1500, tone: "sea" },
  { key: "lieutenant", label: "Лейтенант", minXp: 3000, tone: "gold" },
  { key: "commander", label: "Капитан-лейтенант", minXp: 6000, tone: "gold" },
  { key: "captain", label: "Капитан", minXp: 10000, tone: "coral" },
  { key: "admiral", label: "Адмирал", minXp: 20000, tone: "violet" },
];

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  xpIntoRank: number;
  xpForNext: number;
  pct: number;
}

export function rankForXp(xp: number): RankProgress {
  let currentIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) currentIdx = i;
  }
  const rank = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] ?? null;
  const xpIntoRank = xp - rank.minXp;
  const xpForNext = next ? next.minXp - rank.minXp : 0;
  const pct = next ? Math.min(100, Math.round((xpIntoRank / xpForNext) * 100)) : 100;
  return { rank, next, xpIntoRank, xpForNext, pct };
}

export const TONE_CLASSES: Record<Rank["tone"], { bg: string; ring: string; text: string }> = {
  slate: {
    bg: "bg-gradient-to-br from-slate-500 to-slate-700",
    ring: "ring-slate-300/60",
    text: "text-slate-100",
  },
  sea: {
    bg: "bg-gradient-to-br from-sea-400 to-sea-700",
    ring: "ring-sea-300/60",
    text: "text-sea-50",
  },
  teal: {
    bg: "bg-gradient-to-br from-emerald-400 to-teal-700",
    ring: "ring-emerald-300/60",
    text: "text-emerald-50",
  },
  gold: {
    bg: "bg-gradient-to-br from-gold-300 to-gold-600",
    ring: "ring-gold-300/60",
    text: "text-gold-50",
  },
  coral: {
    bg: "bg-gradient-to-br from-coral-400 to-rose-700",
    ring: "ring-coral-300/60",
    text: "text-coral-50",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-400 to-indigo-700",
    ring: "ring-violet-300/60",
    text: "text-violet-50",
  },
};
