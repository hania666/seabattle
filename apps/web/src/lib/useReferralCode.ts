import { useCallback, useEffect, useState } from "react";
import { SERVER_URL } from "./socket";
import type { AuthedFetch } from "./useAuth";

export interface UseReferralCode {
  code: string | null;
  /**
   * Earliest UTC time (ISO) at which the user may change their code again.
   * `null` while loading, before any code is set, or once the cooldown
   * has elapsed.
   */
  cooldownUntil: string | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Set or rename the vanity referral code. Returns `false` and sets
   * `error` on cooldown ("referral_code_cooldown"), uniqueness collision
   * ("referral_code_taken"), reserved word ("referral_code_reserved"),
   * or any other failure.
   */
  setCode: (code: string) => Promise<boolean>;
}

interface ProfileMeResponse {
  user?: {
    referral_code?: string | null;
    referral_code_changed_at?: string | null;
  };
}

interface MutationOk {
  ok: true;
  user: { referral_code: string | null; referral_code_changed_at: string | null };
  nextAllowedAt: string | null;
}
interface MutationErr {
  ok?: false;
  error?: string;
  nextAllowedAt?: string;
}
type Mutation = MutationOk | MutationErr;

/**
 * Default server-side cooldown for referral-code changes (24h). Mirrored
 * here so the UI can disable the change button without a round-trip; the
 * server is still source-of-truth and will reject on mismatch.
 */
const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

function deriveCooldownFromChangedAt(changedAt: string | null | undefined): string | null {
  if (!changedAt) return null;
  const ms = new Date(changedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  const next = ms + COOLDOWN_MS;
  if (next <= Date.now()) return null;
  return new Date(next).toISOString();
}

export function useReferralCode(
  wallet: string | undefined,
  authedFetch: AuthedFetch,
): UseReferralCode {
  const [code, setCodeState] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setCodeState(null);
      setCooldownUntil(null);
      return;
    }
    setIsLoading(true);
    authedFetch(`${SERVER_URL}/api/profile/me`)
      .then((r) => r.json())
      .then((data: ProfileMeResponse) => {
        setCodeState(data.user?.referral_code ?? null);
        setCooldownUntil(deriveCooldownFromChangedAt(data.user?.referral_code_changed_at));
      })
      .catch(() => {
        setCodeState(null);
        setCooldownUntil(null);
      })
      .finally(() => setIsLoading(false));
  }, [wallet, authedFetch]);

  const setCode = useCallback(
    async (value: string): Promise<boolean> => {
      setError(null);
      try {
        const r = await authedFetch(`${SERVER_URL}/api/profile/referral-code`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        const data = (await r.json()) as Mutation;
        if (!r.ok) {
          const err = data as MutationErr;
          if (
            r.status === 429 &&
            err.error === "referral_code_cooldown" &&
            err.nextAllowedAt
          ) {
            setCooldownUntil(err.nextAllowedAt);
          }
          setError(err.error ?? "failed");
          return false;
        }
        const ok = data as MutationOk;
        setCodeState(ok.user.referral_code);
        setCooldownUntil(ok.nextAllowedAt);
        window.dispatchEvent(
          new CustomEvent("referral-code:updated", { detail: ok.user.referral_code }),
        );
        return true;
      } catch {
        setError("network error");
        return false;
      }
    },
    [authedFetch],
  );

  return { code, cooldownUntil, isLoading, error, setCode };
}
