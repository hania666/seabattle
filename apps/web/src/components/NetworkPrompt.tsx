import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { abstractTestnet } from "viem/chains";
import { useT } from "../lib/i18n";

/**
 * Shows a single-line warning when the connected wallet is on a chain other
 * than Abstract Sepolia testnet (the only chain we support during beta) with
 * a one-click switch button. wagmi's `switchChain` will trigger the wallet's
 * native switch flow (or, for AGW, the embedded wallet's chain selector).
 *
 * Renders nothing in the common case (wallet disconnected or already on the
 * expected chain), so it has no visual cost in the happy path.
 *
 * The expected chain id comes from `viem/chains` rather than env so we can
 * never accidentally render a switch button to the wrong network.
 */

const EXPECTED_CHAIN_ID = abstractTestnet.id;
const EXPECTED_CHAIN_NAME = abstractTestnet.name;

export function NetworkPrompt(): JSX.Element | null {
  const t = useT();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  // Show a transient "switch failed" message for ~6s after a wallet rejection
  // / unsupported-chain error. The wagmi error is sticky until the next call,
  // and we don't want to keep it on screen forever.
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!error) return;
    setShowError(true);
    const id = window.setTimeout(() => setShowError(false), 6000);
    return () => window.clearTimeout(id);
  }, [error]);

  if (!isConnected) return null;
  if (chainId === EXPECTED_CHAIN_ID) return null;

  return (
    <div
      role="alert"
      className="border-b border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-50 sm:px-6"
      data-testid="network-prompt"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2">
          <span aria-hidden>⚠️</span>
          <span>
            {t("network.wrong", { chain: EXPECTED_CHAIN_NAME })}
            {showError && error?.message && (
              <span
                className="ml-2 text-rose-200/80"
                data-testid="network-prompt-error"
              >
                · {error.message}
              </span>
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={() => switchChain({ chainId: EXPECTED_CHAIN_ID })}
          disabled={isPending}
          className="shrink-0 self-end rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          data-testid="network-prompt-switch"
        >
          {isPending ? t("network.switching") : t("network.switch")}
        </button>
      </div>
    </div>
  );
}
