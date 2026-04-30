import { useState } from "react";

interface Props {
  address: string;
}

export function ReferralLink({ address }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}?ref=${address}`;

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
