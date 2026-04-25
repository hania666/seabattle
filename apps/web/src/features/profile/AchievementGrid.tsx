import { ACHIEVEMENTS, useAchievements } from "../../lib/achievements";
import { useT } from "../../lib/i18n";

interface Props {
  address: string | null | undefined;
}

export function AchievementGrid({ address }: Props) {
  const t = useT();
  const state = useAchievements(address);

  let unlocked = 0;
  let coinsEarned = 0;
  for (const def of ACHIEVEMENTS) {
    if (state[def.id].unlockedAt) {
      unlocked++;
      coinsEarned += def.reward;
    }
  }

  return (
    <section data-testid="achievements">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-sea-100">{t("ach.section.title")}</h3>
        <span className="text-xs text-sea-400">
          {t("ach.section.subtitle", {
            n: unlocked,
            total: ACHIEVEMENTS.length,
            coins: coinsEarned,
          })}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((def) => {
          const p = state[def.id];
          const done = p.unlockedAt !== null;
          const pct = Math.min(100, Math.round((p.progress / def.target) * 100));
          return (
            <li
              key={def.id}
              className={`rounded-2xl border p-3 transition ${
                done
                  ? "border-gold-400/40 bg-gold-500/10"
                  : "border-sea-800/70 bg-sea-950/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl ring-1 ${
                    done
                      ? "bg-gold-500/20 ring-gold-400/50"
                      : "bg-sea-900/70 ring-sea-700/50 grayscale"
                  }`}
                  aria-hidden
                >
                  {def.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4
                      className={`truncate text-sm font-semibold ${
                        done ? "text-gold-100" : "text-sea-100"
                      }`}
                    >
                      {t(def.titleKey)}
                    </h4>
                    <span className="shrink-0 text-[11px] font-bold text-gold-300">
                      {t("ach.reward", { n: def.reward })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-sea-300">{t(def.descKey)}</p>
                  {def.target > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sea-900/70 ring-1 ring-sea-800/70">
                        <div
                          className={`h-full rounded-full ${
                            done
                              ? "bg-gradient-to-r from-gold-300 to-gold-500"
                              : "bg-sea-500/70"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-sea-400">
                        {p.progress}/{def.target}
                      </span>
                    </div>
                  )}
                  {def.titleBadge && done && (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gold-300">
                      « {t(def.titleBadge)} »
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
