import { Suspense, lazy, useState } from "react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "./components/ui";
import { shortAddress } from "./lib/format";

const PveScreen = lazy(() =>
  import("./features/pve/PveScreen").then((m) => ({ default: m.PveScreen })),
);
const PvpScreen = lazy(() =>
  import("./features/pvp/PvpScreen").then((m) => ({ default: m.PvpScreen })),
);

type Screen = "home" | "pve" | "pvp";

export default function App() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-sea-700/40 px-6 py-4">
        <button
          onClick={() => setScreen("home")}
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight"
        >
          <LogoMark />
          Sea3<span className="text-sea-500">Battle</span>
        </button>
        <div className="flex items-center gap-3 text-sm">
          {screen === "home" && (
            <div className="hidden gap-2 sm:flex">
              <Button variant="primary" onClick={() => setScreen("pve")}>
                Play vs bot
              </Button>
              <Button variant="secondary" onClick={() => setScreen("pvp")}>
                PvP arena
              </Button>
            </div>
          )}
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-lg border border-sea-500 px-4 py-2 font-medium hover:bg-sea-500/10"
              data-testid="disconnect-button"
            >
              {shortAddress(address)} · Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              className="rounded-lg bg-sea-500 px-4 py-2 font-semibold text-white hover:bg-sea-700"
              data-testid="connect-button"
            >
              Connect Abstract Wallet
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <Suspense fallback={<ScreenSpinner />}>
          {screen === "home" && (
            <Home onPvE={() => setScreen("pve")} onPvP={() => setScreen("pvp")} />
          )}
          {screen === "pve" && <PveScreen onExit={() => setScreen("home")} />}
          {screen === "pvp" && <PvpScreen onExit={() => setScreen("home")} />}
        </Suspense>
      </main>

      <footer className="border-t border-sea-700/40 px-6 py-4 text-center text-xs text-sea-100/40">
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
      <rect width="64" height="64" rx="14" fill="#0c2d48" />
      <circle cx="32" cy="32" r="22" stroke="#0284c7" strokeWidth="2" opacity="0.4" />
      <path d="M20 32 L44 32 L40 38 L24 38 Z" fill="#e0f2fe" stroke="#071a2b" strokeWidth="1.5" />
      <rect x="30" y="22" width="4" height="10" fill="#e0f2fe" />
      <circle cx="32" cy="22" r="2.5" fill="#f87171" />
    </svg>
  );
}

function Home({ onPvE, onPvP }: { onPvE: () => void; onPvP: () => void }) {
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-8">
      <section className="space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sea-500">
          Pre-alpha · Abstract Testnet
        </p>
        <h2 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
          PvP Battleship<br />with ETH stakes.
        </h2>
        <p className="mx-auto max-w-2xl text-base text-sea-100/80 sm:text-lg">
          Stake, play, claim. The winner takes <strong className="text-sea-100">95 %</strong> of
          the pot on-chain — no custody, no middlemen. PvE mode farms Abstract XP against bots.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="lg" variant="primary" onClick={onPvE} data-testid="home-pve">
            Play vs bot
          </Button>
          <Button size="lg" variant="secondary" onClick={onPvP} data-testid="home-pvp">
            PvP arena
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Fully on-chain stakes"
          body="Entry fees lock into the BattleshipLobby contract. 5 % platform fee, 95 % to the winner — verifiable on Abscan."
          kicker="Contracts"
        />
        <FeatureCard
          title="Signed results"
          body="The server signs match results via EIP-191. Winners redeem the pot with claimWin; drop-outs refund via claimTimeout."
          kicker="ECDSA"
        />
        <FeatureCard
          title="XP from PvE"
          body="Beat the bots to rack up Abstract XP. Daily +25 bonus and +500 for a 7-day streak, all tracked in BotMatch."
          kicker="XP"
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

function FeatureCard({ title, body, kicker }: { title: string; body: string; kicker: string }) {
  return (
    <div className="rounded-2xl border border-sea-700/60 bg-sea-900/60 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sea-500">
        {kicker}
      </div>
      <h3 className="mt-2 font-display text-lg text-sea-50">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-sea-100/80">{body}</p>
    </div>
  );
}

function Howto({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-sea-700/60 bg-sea-900/40 p-5">
      <h3 className="font-display text-lg text-sea-50">{title}</h3>
      <ol className="mt-3 space-y-2 text-sm text-sea-100/80">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sea-700 text-[11px] font-semibold text-sea-100">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
