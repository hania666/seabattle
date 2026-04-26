import { useAccount } from "wagmi";
import { useAuth } from "../lib/useAuth";
import { useT } from "../lib/i18n";

/**
 * Small inline button rendered next to the wallet pill. Visible only when an
 * AGW is connected but the user hasn't completed SIWE yet. Once the JWT lands,
 * the button hides itself; the next time `requireAuth` middleware fires on the
 * server, the request goes through with the Bearer header attached.
 */
export function SignInButton() {
  const { isConnected } = useAccount();
  const { token, isSigningIn, error, signIn } = useAuth();
  const t = useT();

  if (!isConnected || token) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void signIn();
      }}
      disabled={isSigningIn}
      data-testid="signin-button"
      title={error ?? undefined}
      className="rounded-lg border border-sea-500/40 bg-sea-900/60 px-3 py-2 text-xs font-medium text-sea-100 transition hover:border-gold-400/50 hover:text-gold-200 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
    >
      {isSigningIn ? t("auth.signingIn") : t("auth.signIn")}
    </button>
  );
}
