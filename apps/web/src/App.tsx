import { Suspense, lazy, useState } from "react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "./components/ui";
import { shortAddress } from "./lib/format";
import { Splash } from "./features/splash/Splash";
import { splashSeen } from "./features/splash/splashState";

const PveScreen = lazy(() =>
  import("./features/pve/PveScreen").then((m) => ({ default: m.PveScreen })),
);
const PvpScreen = lazy(() =>
  import("./features/pvp/PvpScreen").then((m) => ({ default: m.PvpScreen })),
);
const ProfileScreen = lazy(() =>
  import("./features/profile/ProfileScreen").then((m) => ({ default: m.ProfileScreen })),
);

type Screen = "home" | "pve" | "pvp" | "profile";

export default function App() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [screen, setScreen] = useState<Screen>("home");
  const [showSplash, setShowSplash] = useState(() => !splashSeen());

  return (
    <>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-sea-800/60 bg-sea-950/40 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setScreen("home")}
            className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-sea-50 hover:text-sea-200"
            aria-label="Sea3Battle home"
          >
            <LogoMark />
            Sea<span className="text-sea-300">3</span>
            <span className="text-sea-100">Battle</span>
          </button>
          <nav className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setScreen("profile")}
              className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:inline-flex ${
                screen === "profile"
                  ? "bg-sea-800/70 text-sea-50"
                  : "text-sea-200 hover:bg-sea-800/40"
              }`}
              data-testid="nav-profile"
            >
              Profile
            </button>
            {isConnected ? (
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-lg border border-sea-500/60 px-3 py-2 text-sm font-medium text-sea-100 hover:bg-sea-500/10"
                data-testid="disconnect-button"
              >
                {shortAddress(address)} · Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => login()}
                className="rounded-lg bg-gradient-to-r from-sea-400 to-sea-500 px-4 py-2 text-sm font-semibold text-sea-950 shadow-glow hover:from-sea-300 hover:to-sea-400"
                data-testid="connect-button"
              >
                Connect Abstract Wallet
              </button>
            )}
          </nav>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <Suspense fallback={<ScreenSpinner />}>
            {screen === "home" && (
              <Home
                onPvE={() => setScreen("pve")}
                onPvP={() => setScreen("pvp")}
                onProfile={() => setScreen("profile")}
              />
            )}
            {screen === "pve" && <PveScreen onExit={() => setScreen("home")} />}
            {screen === "pvp" && <PvpScreen onExit={() => setScreen("home")} />}
            {screen === "profile" && (
              <ProfileScreen
                onExit={() => setScreen("home")}
                onPlayPvE={() => setScreen("pve")}
                onPlayPvP={() => setScreen("pvp")}
              />
            )}
          </Suspense>
        </main>

        <footer className="border-t border-sea-800/60 bg-sea-950/30 px-6 py-4 text-center text-xs text-sea-200/60">
          Built on Abstract · MIT licensed ·{" "}
          <a
            className="underline hover:text-sea-100"
            href="https://github.com/hania666/seabattle"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </footer>
      </div>
    </>
  );
}

function ScreenSpinner() {
  return (
    <div className="flex items-center justify-center py-24 text-sea-300">
      <div className="flex items-center gap-3 text-sm">
        <span className="h-2 w-2 animate-ping rounded-full bg-sea-300" />
        Loading…
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className="h-7 w-7 shrink-0"
      fill="none"
    >
      <rect width="64" height="64" rx="14" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" stroke="#38bdf8" strokeWidth="2" opacity="0.4" />
      <path d="M18 34 L46 34 L42 40 L22 40 Z" fill="#e0f2fe" stroke="#082f49" strokeWidth="1.5" />
      <rect x="30" y="22" width="4" height="12" fill="#e0f2fe" />
      <path d="M32 22 L32 14 L41 18 L32 22" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
      <circle cx="32" cy="28" r="1.6" fill="#fbbf24" />
    </svg>
  );
}

function Home({
  onPvE,
  onPvP,
  onProfile,
}: {
  onPvE: () => void;
  onPvP: () => void;
  onProfile: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-14 py-4 sm:py-8">
      <section className="animate-fade-in space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sea-300">
          Pre-alpha · Abstract Testnet
        </p>
        <h2 className="font-display text-4xl font-bold leading-tight text-sea-50 sm:text-6xl">
          PvP Battleship<br />
          <span className="bg-gradient-to-r from-sea-200 via-sea-300 to-gold-300 bg-clip-text text-transparent">
            with ETH stakes.
          </span>
        </h2>
        <p className="mx-auto max-w-2xl text-base text-sea-100/90 sm:text-lg">
          Stake, play, claim. The winner takes{" "}
          <strong className="text-gold-300">95 %</strong> of the pot on-chain — no custody, no
          middlemen. PvE mode farms Abstract XP against bots.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="lg" variant="primary" onClick={onPvE} data-testid="home-pve">
            Play vs bot
          </Button>
          <Button size="lg" variant="secondary" onClick={onPvP} data-testid="home-pvp">
            PvP arena
          </Button>
          <Button size="lg" variant="ghost" onClick={onProfile} data-testid="home-profile">
            My profile
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Fully on-chain stakes"
          body="Entry fees lock into the BattleshipLobby contract. 5 % platform fee, 95 % to the winner — verifiable on Abscan."
          kicker="Contracts"
          tone="sea"
        />
        <FeatureCard
          title="Signed results"
          body="The server signs match results via EIP-191. Winners redeem the pot with claimWin; drop-outs refund via claimTimeout."
          kicker="ECDSA"
          tone="sea"
        />
        <FeatureCard
          title="XP from PvE"
          body="Beat the bots to rack up Abstract XP. Daily +25 bonus and +500 for a 7-day streak, all tracked in BotMatch."
          kicker="XP"
          tone="gold"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Howto
          title="Play vs bot"
          steps={[
            "Pick a difficulty — the entry fee is the stake.",
            "Place your fleet (or Randomize).",
            "Sink the bot. Win = XP recorded on-chain.",
          ]}
        />
        <Howto
          title="Host or join PvP"
          steps={[
            "Pick a stake and host or auto-join a random lobby.",
            "Both players place fleets — play alternates on miss.",
            "Winner claims 95 % of the pot with one transaction.",
          ]}
        />
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  kicker,
  tone = "sea",
}: {
  title: string;
  body: string;
  kicker: string;
  tone?: "sea" | "gold";
}) {
  const kickerCls =
    tone === "gold"
      ? "text-gold-300"
      : "text-sea-300";
  return (
    <div className="rounded-2xl border border-sea-800/60 bg-sea-950/40 p-5 shadow-glow/0 backdrop-blur transition hover:border-sea-400/60 hover:bg-sea-900/50">
      <div className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${kickerCls}`}>
        {kicker}
      </div>
      <h3 className="mt-2 font-display text-lg text-sea-50">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-sea-100/80">{body}</p>
    </div>
  );
}

function Howto({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-sea-800/60 bg-sea-950/30 p-5 backdrop-blur">
      <h3 className="font-display text-lg text-sea-50">{title}</h3>
      <ol className="mt-3 space-y-2 text-sm text-sea-100/90">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sea-400 to-sea-600 text-[11px] font-bold text-sea-950">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
