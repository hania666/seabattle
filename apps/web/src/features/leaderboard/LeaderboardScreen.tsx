import { useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { BackLink, Button, Card } from "../../components/ui";
import { shortAddress } from "../../lib/format";
import { rankForXp, TONE_CLASSES, RANKS } from "../../lib/ranks";
import { loadStats } from "../../lib/stats";
import { useT } from "../../lib/i18n";
import {
  buildSubmitMessage,
  fetchLeaderboard,
  submitLeaderboard,
  type LeaderboardEntry,
} from "../../lib/leaderboard";

interface Props {
  onExit: () => void;
}

/**
 * Global leaderboard — fetches from the matchmaking server. If the server
 * isn't reachable (e.g. pre-Phase-6 preview), falls back to a demo roster so
 * the layout is still showable.
 */
export function LeaderboardScreen({ onExit }: Props) {
  const t = useT();
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | "ok" | "error" | "pending">(null);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const res = await fetchLeaderboard(50);
      if (!live) return;
      if (!res) {
        setEntries(DEMO_ENTRIES);
        setOffline(true);
      } else {
        setEntries(res.top);
        setOffline(false);
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const selfStats = useMemo(() => loadStats(address), [address]);
  const selfRank = rankForXp(selfStats.xp).rank;
  const selfIndex = address
    ? entries.findIndex((e) => e.address.toLowerCase() === address.toLowerCase())
    : -1;

  async function onSubmit() {
    if (!address) return;
    const nonce = Date.now();
    const payload = {
      address: address as `0x${string}`,
      xp: selfStats.xp,
      wins: selfStats.pveWins + selfStats.pvpWins,
      losses: selfStats.pveLosses + selfStats.pvpLosses,
      rankKey: selfRank.key,
      nonce,
    };
    const message = buildSubmitMessage(payload);
    try {
      setSubmitStatus("pending");
      const signature = await signMessageAsync({ message });
      const ok = await submitLeaderboard(payload, signature);
      setSubmitStatus(ok ? "ok" : "error");
      if (ok) {
        const res = await fetchLeaderboard(50);
        if (res) {
          setEntries(res.top);
          setOffline(false);
        }
      }
    } catch {
      setSubmitStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sea-400">
            Global ranks
          </p>
          <h2 className="font-display text-3xl font-bold text-sea-50 sm:text-4xl">
            Leaderboard
          </h2>
        </div>
        {isConnected ? (
          <Button
            onClick={onSubmit}
            disabled={signing || submitStatus === "pending"}
            variant="primary"
          >
            {signing || submitStatus === "pending"
              ? "Signing…"
              : "Submit my XP"}
          </Button>
        ) : (
          <p className="text-xs text-sea-300">Connect a wallet to sign & submit your XP.</p>
        )}
      </header>

      {offline && (
        <div
          role="status"
          className="rounded-xl border border-gold-400/40 bg-gold-500/10 px-4 py-3 text-xs text-gold-200"
        >
          Showing <strong>demo data</strong> — the matchmaking server isn't reachable yet. Your
          real XP will appear here as soon as the backend is deployed.
        </div>
      )}
      {submitStatus === "ok" && (
        <div className="rounded-xl border border-sea-400/40 bg-sea-500/10 px-4 py-3 text-xs text-sea-100">
          Submitted! Refreshing rankings…
        </div>
      )}
      {submitStatus === "error" && (
        <div className="rounded-xl border border-coral-400/40 bg-coral-500/10 px-4 py-3 text-xs text-coral-200">
          Could not submit — sign request rejected, or server unreachable.
        </div>
      )}

      <Card>
        {loading ? (
          <p className="py-6 text-center text-sm text-sea-300">Loading captains…</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-sea-300">
            No captains have reported yet. Be the first.
          </p>
        ) : (
          <ol className="divide-y divide-sea-800/70">
            {entries.map((e, idx) => {
              const rank = RANKS.find((r) => r.key === e.rankKey) ?? RANKS[0];
              const tone = TONE_CLASSES[rank.tone];
              const isSelf =
                address && e.address.toLowerCase() === address.toLowerCase();
              return (
                <li
                  key={e.address}
                  className={`flex items-center gap-3 py-3 text-sm ${
                    isSelf ? "-mx-3 rounded-xl bg-sea-800/40 px-3 ring-1 ring-sea-500/40" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold tabular-nums ${
                      idx === 0
                        ? "bg-gold-400 text-sea-950"
                        : idx === 1
                          ? "bg-sea-300 text-sea-950"
                          : idx === 2
                            ? "bg-orange-400 text-sea-950"
                            : "bg-sea-900/60 text-sea-200 ring-1 ring-sea-700/60"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 sm:inline-flex ${tone.bg} ${tone.text} ${tone.ring}`}
                  >
                    {t(rank.labelKey)}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs text-sea-100">
                    {shortAddress(e.address)}
                    {isSelf && (
                      <span className="ml-2 rounded bg-sea-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sea-200">
                        YOU
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    <div className="font-display text-base font-bold text-gold-300 tabular-nums">
                      {e.xp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-sea-400 tabular-nums">
                      {e.wins}W · {e.losses}L
                    </div>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {selfIndex === -1 && isConnected && (
        <Card>
          <p className="text-sm text-sea-200">
            You're not on the board yet. Play a few matches and hit <em>Submit my XP</em>{" "}
            above — it costs a signature (no gas).
          </p>
        </Card>
      )}

      <div className="pt-2">
        <BackLink onClick={onExit} label="Home" />
      </div>
    </div>
  );
}

const DEMO_ENTRIES: LeaderboardEntry[] = [
  {
    address: "0x1111111111111111111111111111111111111111",
    xp: 18_420,
    wins: 142,
    losses: 31,
    rankKey: "captain",
    updatedAt: Date.now() - 1_000 * 60 * 12,
  },
  {
    address: "0x2222222222222222222222222222222222222222",
    xp: 12_780,
    wins: 96,
    losses: 27,
    rankKey: "captain",
    updatedAt: Date.now() - 1_000 * 60 * 40,
  },
  {
    address: "0x3333333333333333333333333333333333333333",
    xp: 9_420,
    wins: 78,
    losses: 33,
    rankKey: "commander",
    updatedAt: Date.now() - 1_000 * 60 * 67,
  },
  {
    address: "0x4444444444444444444444444444444444444444",
    xp: 7_150,
    wins: 64,
    losses: 25,
    rankKey: "commander",
    updatedAt: Date.now() - 1_000 * 60 * 90,
  },
  {
    address: "0x5555555555555555555555555555555555555555",
    xp: 4_320,
    wins: 43,
    losses: 21,
    rankKey: "lieutenant",
    updatedAt: Date.now() - 1_000 * 60 * 132,
  },
  {
    address: "0x6666666666666666666666666666666666666666",
    xp: 2_100,
    wins: 28,
    losses: 19,
    rankKey: "midshipman",
    updatedAt: Date.now() - 1_000 * 60 * 200,
  },
  {
    address: "0x7777777777777777777777777777777777777777",
    xp: 820,
    wins: 12,
    losses: 8,
    rankKey: "bosun",
    updatedAt: Date.now() - 1_000 * 60 * 320,
  },
];
