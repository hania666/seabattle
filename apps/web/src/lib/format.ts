/** Shorten an Ethereum address for display, e.g. 0x1234…abcd */
export function shortAddress(address: string | undefined | null): string {
  if (!address) return "";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Shorten a hex hash (tx or matchId) for display. */
export function shortHash(hash: string | undefined | null): string {
  if (!hash) return "";
  if (hash.length < 14) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

/** Extract a human-readable message from a thrown value. */
export function errMessage(e: unknown): string {
  if (!e) return "Unknown error";
  if (e instanceof Error) {
    // wagmi / viem errors often put the useful bit in .shortMessage
    const withShort = e as Error & { shortMessage?: string };
    return withShort.shortMessage || e.message;
  }
  return String(e);
}
