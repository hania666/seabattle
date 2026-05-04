const REF_KEY = "seabattle:ref";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
// Vanity referral code: same shape the server enforces in setReferralCode +
// resolveReferrer. Persisting wider input would be pointless because the
// server would reject it on /auth/verify.
const CODE_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

export function saveRef(ref: string): void {
  if (WALLET_RE.test(ref)) {
    localStorage.setItem(REF_KEY, ref.toLowerCase());
    return;
  }
  if (CODE_RE.test(ref)) {
    // Codes are case-insensitive on the server; lowercase here so we don't
    // store two visually-different copies for the same referrer.
    localStorage.setItem(REF_KEY, ref.toLowerCase());
  }
}

export function getRef(): string | null {
  return localStorage.getItem(REF_KEY);
}

export function clearRef(): void {
  localStorage.removeItem(REF_KEY);
}
