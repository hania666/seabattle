import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";

export default function App() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-sea-700/40">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Sea3<span className="text-sea-500">Battle</span>
        </h1>
        {isConnected ? (
          <button
            type="button"
            onClick={() => disconnect()}
            className="rounded-lg border border-sea-500 px-4 py-2 text-sm font-medium hover:bg-sea-500/10"
          >
            {address?.slice(0, 6)}…{address?.slice(-4)} · Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={() => login()}
            className="rounded-lg bg-sea-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sea-700"
          >
            Connect Abstract Wallet
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center space-y-6">
          <p className="uppercase tracking-[0.3em] text-sea-500 text-xs font-semibold">
            Pre-alpha · Abstract Testnet
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            PvP Battleship with ETH stakes.
          </h2>
          <p className="text-sea-100/80 text-lg">
            Stake, play, claim. The winner takes 95 % of the pot on-chain — no
            custody, no middlemen. PvE mode farms Abstract XP against bots.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-sea-100/60">
            <span className="rounded-full border border-sea-700 px-3 py-1">
              Game UI · coming soon
            </span>
            <span className="rounded-full border border-sea-700 px-3 py-1">
              Contracts · scaffolded
            </span>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-xs text-sea-100/40 text-center border-t border-sea-700/40">
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
