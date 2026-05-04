import { useCallback, useEffect, useState } from "react";
import { SERVER_URL } from "./socket";
import type { AuthedFetch } from "./useAuth";

export interface UseUsername {
  username: string | null;
  /**
   * Earliest UTC time (ISO) at which the user may rename again. `null` while
   * loading, before any name is set, or once the cooldown has elapsed.
   */
  cooldownUntil: string | null;
  isLoading: boolean;
  error: string | null;
  /** Set the initial display name. Used by the first-sign-in modal. */
  setUsername: (name: string) => Promise<boolean>;
  /**
   * Rename to a new display name. Returns `false` and sets `error` on
   * cooldown ("username_cooldown"), uniqueness collision ("username_taken"),
   * or any other failure. On success, `cooldownUntil` is updated.
   */
  changeUsername: (name: string) => Promise<boolean>;
}

interface ProfileMeResponse {
  user?: {
    display_name?: string | null;
    display_name_changed_at?: string | null;
  };
}

interface UsernameMutationOk {
  ok: true;
  user: { display_name: string | null; display_name_changed_at: string | null };
  nextAllowedAt: string | null;
}
interface UsernameMutationErr {
  ok?: false;
  error?: string;
  nextAllowedAt?: string;
}
type UsernameMutation = UsernameMutationOk | UsernameMutationErr;

/**
 * Server-side cooldown for renames. The server is the source of truth — we
 * mirror the same window here so the UI can grey-out the rename button and
 * show "next change in N days" without an extra round-trip. The number must
 * stay in sync with `DISPLAY_NAME_CHANGE_COOLDOWN_DAYS` on the server.
 */
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function deriveCooldownFromChangedAt(changedAt: string | null | undefined): string | null {
  if (!changedAt) return null;
  const ms = new Date(changedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  const next = ms + COOLDOWN_MS;
  if (next <= Date.now()) return null;
  return new Date(next).toISOString();
}

export function useUsername(
  wallet: string | undefined,
  authedFetch: AuthedFetch,
): UseUsername {
  const [username, setUsernameState] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setUsernameState(null);
      setCooldownUntil(null);
      return;
    }
    setIsLoading(true);
    authedFetch(`${SERVER_URL}/api/profile/me`)
      .then((r) => r.json())
      .then((data: ProfileMeResponse) => {
        setUsernameState(data.user?.display_name ?? null);
        setCooldownUntil(deriveCooldownFromChangedAt(data.user?.display_name_changed_at));
      })
      .catch(() => {
        setUsernameState(null);
        setCooldownUntil(null);
      })
      .finally(() => setIsLoading(false));
  }, [wallet, authedFetch]);

  const submit = useCallback(
    async (name: string, method: "POST" | "PUT"): Promise<boolean> => {
      setError(null);
      try {
        const r = await authedFetch(`${SERVER_URL}/api/profile/username`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name }),
        });
        const data = (await r.json()) as UsernameMutation;
        if (!r.ok) {
          // Surface the server's machine-readable error code so callers can
          // localize / branch on it. We don't translate here because this
          // hook deliberately stays UI-agnostic.
          const err = data as UsernameMutationErr;
          if (r.status === 429 && err.error === "username_cooldown" && err.nextAllowedAt) {
            setCooldownUntil(err.nextAllowedAt);
          }
          setError(err.error ?? "failed");
          return false;
        }
        const ok = data as UsernameMutationOk;
        setUsernameState(ok.user.display_name);
        setCooldownUntil(ok.nextAllowedAt);
        window.dispatchEvent(new CustomEvent("username:updated", { detail: name }));
        return true;
      } catch {
        setError("network error");
        return false;
      }
    },
    [authedFetch],
  );

  // Two verbs so the UI can render different copy / pre-flight checks
  // (initial set vs. change), but the underlying server logic is the same.
  const setUsername = useCallback((name: string) => submit(name, "POST"), [submit]);
  const changeUsername = useCallback((name: string) => submit(name, "PUT"), [submit]);

  return { username, cooldownUntil, isLoading, error, setUsername, changeUsername };
}
