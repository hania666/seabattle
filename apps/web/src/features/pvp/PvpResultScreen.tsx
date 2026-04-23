import { BackLink, Button, TxLink } from "../../components/ui";
import { shortAddress, shortHash } from "../../lib/format";

interface Props {
  won: boolean;
  stakeEth: string;
  canClaim: boolean;
  claiming: boolean;
  claimed: boolean;
  claimTxHash?: `0x${string}`;
  claimError?: string;
  opponent?: `0x${string}`;
  matchId?: `0x${string}`;
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
  opponent,
  matchId,
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

      {(opponent || matchId) && (
        <div className="mx-auto max-w-sm rounded-xl border border-sea-700/60 bg-sea-900/40 px-4 py-3 text-xs text-sea-300">
          {opponent && (
            <div>
              Opponent: <span className="font-mono text-sea-100">{shortAddress(opponent)}</span>
            </div>
          )}
          {matchId && (
            <div>
              Match: <span className="font-mono text-sea-100">{shortHash(matchId)}</span>
            </div>
          )}
        </div>
      )}

      {won && canClaim && !claimed && (
        <Button
          size="lg"
          variant="primary"
          onClick={onClaim}
          disabled={claiming}
          data-testid="claim-button"
        >
          {claiming ? "Claiming…" : "Claim 95 % of pot"}
        </Button>
      )}

      {won && !canClaim && (
        <p className="text-sm text-sea-300">
          Server signature unavailable (lobby contract not configured). Nothing to claim on-chain.
        </p>
      )}

      {claimed && claimTxHash && (
        <p className="text-sm text-sea-300">
          Claimed. <TxLink hash={claimTxHash} className="text-sea-100" />
        </p>
      )}

      {claimError && <p className="text-sm text-red-300">{claimError}</p>}

      <BackLink onClick={onExit} />
    </div>
  );
}
