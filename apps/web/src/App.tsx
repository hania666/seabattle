import { useState } from "react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";
import { PveScreen } from "./features/pve/PveScreen";

type Screen = "home" | "pve";

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
          className="font-display text-2xl font-bold tracking-tight"
        >
          Sea3<span className="text-sea-500">Battle</span>
        </button>
        <div className="flex items-center gap-3 text-sm">
          {screen === "home" && (
            <button
              onClick={() => setScreen("pve")}
              className="rounded-lg bg-sea-300 px-4 py-2 font-semibold text-sea-950 transition hover:bg-sea-200"
            >
              Play vs bot
            </button>
          )}
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-lg border border-sea-500 px-4 py-2 font-medium hover:bg-sea-500/10"
            >
              {address?.slice(0, 6)}…{address?.slice(-4)} · Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              className="rounded-lg bg-sea-500 px-4 py-2 font-semibold text-white hover:bg-sea-700"
            >
              Connect Abstract Wallet
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        {screen === "home" && <Home onPlay={() => setScreen("pve")} />}
        {screen === "pve" && <PveScreen onExit={() => setScreen("home")} />}
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

function Home({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sea-500">
        Pre-alpha · Abstract Testnet
      </p>
      <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
        PvP Battleship with ETH stakes.
      </h2>
      <p className="text-lg text-sea-100/80">
        Stake, play, claim. The winner takes 95 % of the pot on-chain — no custody, no middlemen.
        PvE mode farms Abstract XP against bots.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onPlay}
          className="rounded-lg bg-sea-300 px-6 py-3 text-sm font-semibold text-sea-950 transition hover:bg-sea-200"
        >
          Play vs bot
        </button>
        <button
          disabled
          title="Coming in phase 4/5"
          className="rounded-lg border border-sea-700 px-6 py-3 text-sm font-semibold text-sea-500"
        >
          PvP (soon)
        </button>
      </div>
    </div>
  );
}
