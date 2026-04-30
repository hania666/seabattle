import { useCallback, useEffect, useState } from "react";
import { SERVER_URL } from "./socket";
import type { AuthedFetch } from "./useAuth";

export interface UseUsername {
  username: string | null;
  isLoading: boolean;
  error: string | null;
  setUsername: (name: string) => Promise<boolean>;
}

export function useUsername(
  wallet: string | undefined,
  authedFetch: AuthedFetch,
): UseUsername {
  const [username, setUsernameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) { setUsernameState(null); return; }
    setIsLoading(true);
    authedFetch(`${SERVER_URL}/api/profile/me`)
      .then((r) => r.json())
      .then((data: { user?: { display_name?: string | null } }) => {
        setUsernameState(data.user?.display_name ?? null);
      })
      .catch(() => setUsernameState(null))
      .finally(() => setIsLoading(false));
  }, [wallet]);

  const setUsername = useCallback(
    async (name: string): Promise<boolean> => {
      setError(null);
      try {
        const r = await authedFetch(`${SERVER_URL}/api/profile/username`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name }),
        });
        const data = (await r.json()) as { ok?: boolean; error?: string };
        if (!r.ok) { setError(data.error ?? "failed"); return false; }
        setUsernameState(name);
        window.dispatchEvent(new CustomEvent("username:updated", { detail: name }));
        return true;
      } catch {
        setError("network error");
        return false;
      }
    },
    [authedFetch],
  );

  return { username, isLoading, error, setUsername };
}
