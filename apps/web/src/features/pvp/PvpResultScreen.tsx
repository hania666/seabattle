interface Props {
  won: boolean;
  stakeEth: string;
  canClaim: boolean;
  claiming: boolean;
  claimed: boolean;
  claimTxHash?: `0x${string}`;
  claimError?: string;
  onClaim: () => void;
  onExit: () => void;
}

export function PvpResultScreen({
  won,
  stakeEth,
  canClaim,
  claiming,
  claimed,
  claimTxHash,
  claimError,
  onClaim,
  onExit,
}: Props) {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div
        className={`inline-block rounded-3xl px-8 py-10 ${
          won ? "bg-sea-300 text-sea-950" : "bg-sea-800 text-sea-100"
        }`}
        data-testid="pvp-result-banner"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">
          {won ? "Victory" : "Defeat"}
        </p>
        <h2 className="font-display text-4xl">
          {won ? `You win ${stakeEth} × 1.9 ETH` : "Opponent claims the pot"}
        </h2>
      </div>

      {won && canClaim && !claimed && (
        <button
          onClick={onClaim}
          disabled={claiming}
          data-testid="claim-button"
          className="rounded-lg bg-sea-300 px-6 py-3 text-sm font-semibold text-sea-950 transition hover:bg-sea-200 disabled:cursor-not-allowed disabled:bg-sea-700 disabled:text-sea-400"
        >
          {claiming ? "Claiming…" : "Claim 95 % of pot"}
        </button>
      )}

      {won && !canClaim && (
        <p className="text-sm text-sea-300">
          Server signature unavailable (lobby contract not configured). Nothing to claim on-chain.
        </p>
      )}

      {claimed && claimTxHash && (
        <p className="text-sm text-sea-300">
          Claimed.{" "}
          <a
            href={`https://sepolia.abscan.org/tx/${claimTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sea-100 underline-offset-4 hover:underline"
          >
            {claimTxHash.slice(0, 10)}…{claimTxHash.slice(-6)}
          </a>
        </p>
      )}

      {claimError && <p className="text-sm text-red-300">{claimError}</p>}

      <button
        onClick={onExit}
        className="text-sm text-sea-400 underline-offset-4 hover:text-sea-200 hover:underline"
      >
        ← Back to home
      </button>
    </div>
  );
}
