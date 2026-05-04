import { useEffect, useState } from "react";
import { useAuth } from "../../lib/useAuth";
import { useReferralCode } from "../../lib/useReferralCode";

interface Props {
  address: string;
}

export function ReferralLink({ address }: Props) {
  const [copied, setCopied] = useState(false);
  const { authedFetch, session } = useAuth();
  const { code } = useReferralCode(session?.wallet, authedFetch);
  // Re-render when ReferralCodeRow saves a new code, so the link below
  // updates without a full reload.
  const [, setTick] = useState(0);
  useEffect(() => {
    const onUpdated = () => setTick((n) => n + 1);
    window.addEventListener("referral-code:updated", onUpdated);
    return () => window.removeEventListener("referral-code:updated", onUpdated);
  }, []);
  const identifier = code ?? address;
  const url = `${window.location.origin}?ref=${identifier}`;

  function copy() {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-sea-400">Referral link:</span>
      <button
        type="button"
        onClick={copy}
        className="text-xs text-gold-300 underline transition hover:text-gold-200"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
