import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { BackLink, Button, Card } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useCoins } from "../../lib/coins";
import {
  canClaimDaily,
  claimDaily,
  dailyClaimRemainingMs,
  loadPowerupState,
  POWERUPS,
  purchasePowerup,
  type PowerupId,
  type PowerupState,
} from "../../lib/powerups";
import { sfx } from "../../lib/audio";

interface Props {
  onExit: () => void;
}

export function ShopScreen({ onExit }: Props) {
  const t = useT();
  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4">
      <ShopBody />
      <div className="pt-2">
        <BackLink onClick={onExit} label={t("common.home")} />
      </div>
    </div>
  );
}

export function ShopBody({ compact = false }: { compact?: boolean } = {}) {
  const t = useT();
  const { address } = useAccount();
  const [state, setState] = useState<PowerupState>(() => loadPowerupState(address));
  const coins = useCoins(address);
  const [flash, setFlash] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  useEffect(() => {
    function refresh() {
      setState(loadPowerupState(address));
    }
    refresh();
    window.addEventListener("powerups:updated", refresh);
    return () => {
      window.removeEventListener("powerups:updated", refresh);
    };
  }, [address]);

  function onBuy(id: PowerupId) {
    const res = purchasePowerup(address, id);
    if (res.ok) {
      sfx.coin();
      setFlash({ kind: "ok", text: `+1 ${t(`shop.${id}.name`)}` });
    } else {
      setFlash({
        kind: "err",
        text: t(`shop.need`, {
          n: res.reason === "insufficient-coins" ? (res.need ?? 0) - (res.have ?? 0) : 0,
        }),
      });
    }
    setTimeout(() => setFlash(null), 1800);
  }

  function onClaim() {
    if (claimDaily(address)) {
      sfx.coin();
      setFlash({ kind: "ok", text: "+1 💣  +1 📡" });
      setTimeout(() => setFlash(null), 1800);
    }
  }

  const claimable = canClaimDaily(state);
  const remaining = useMemo(() => dailyClaimRemainingMs(state), [state]);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sea-400">
            {t("shop.subtitle")}
          </p>
          <h2 className="font-display text-3xl font-bold text-sea-50 sm:text-4xl">
            {t("shop.title")}
          </h2>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-sea-900/70 px-4 py-2 ring-1 ring-gold-400/40">
          <CoinIcon />
          <span
            className="font-display text-xl font-bold text-gold-300 tabular-nums"
            data-testid="shop-coins"
          >
            {coins.toLocaleString()}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-sea-300">
            {t("shop.balance")}
          </span>
        </div>
      </header>

      {flash && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            flash.kind === "ok"
              ? "bg-sea-500/20 text-sea-100 ring-1 ring-sea-400/50"
              : "bg-coral-500/20 text-coral-200 ring-1 ring-coral-400/50"
          }`}
        >
          {flash.text}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 text-3xl shadow-glow-gold">
            🎁
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-display text-xl font-bold text-sea-50">
              {t("shop.daily.title")}
            </div>
            <p className="text-sm text-sea-300">{t("shop.daily.desc")}</p>
          </div>
          <Button
            onClick={onClaim}
            variant="primary"
            disabled={!claimable}
            data-testid="shop-claim-daily"
          >
            {claimable
              ? t("shop.daily.claim")
              : t("shop.daily.claimed", { h: hours, m: minutes })}
          </Button>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2">
        {POWERUPS.map((p) => {
          const count = state.inventory[p.id];
          const affordable = coins >= p.cost;
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                affordable
                  ? "border-sea-400/50 bg-sea-900/60 hover:border-sea-300/70"
                  : "border-sea-800/60 bg-sea-950/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ring-2 ring-sea-700/50"
                  aria-hidden
                >
                  {p.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-sea-50">
                      {t(`shop.${p.id}.name`)}
                    </h3>
                    {count > 0 && (
                      <span className="rounded-full bg-sea-500/20 px-2 py-0.5 text-[10px] font-bold text-sea-200 ring-1 ring-sea-400/50">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sea-300">{t(`shop.${p.id}.desc`)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gold-300">
                  <CoinIcon small />
                  <span className="tabular-nums">{p.cost.toLocaleString()}</span>
                </div>
                <Button
                  variant={affordable ? "primary" : "ghost"}
                  onClick={() => affordable && onBuy(p.id)}
                  disabled={!affordable}
                  data-testid={`shop-buy-${p.id}`}
                >
                  {affordable ? t("shop.buy") : t("shop.need", { n: p.cost - coins })}
                </Button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CoinIcon({ small }: { small?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={small ? "h-4 w-4" : "h-5 w-5"}>
      <circle cx="10" cy="10" r="8" fill="#fbbf24" />
      <circle cx="10" cy="10" r="6" fill="#fcd34d" />
      <path d="M10 5v10M7 8h6M7 12h6" stroke="#b45309" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
