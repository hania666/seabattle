import * as Sentry from "@sentry/node";

const DSN = process.env.SENTRY_DSN?.trim();

let initialised = false;

export function initSentry(): void {
  if (initialised) return;
  if (!DSN) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[sentry] no SENTRY_DSN set — skipping Sentry init");
    }
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.RELEASE_TAG ?? undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: [],
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
  initialised = true;
}

/**
 * Tag the current Sentry isolation scope with a wallet. Called from
 * `requireAuth` so that any error captured during the rest of the
 * request lifecycle is automatically attributed to the user.
 *
 * No-op when Sentry isn't initialised (no DSN). Wallet is lower-cased
 * so it matches what the web client tags.
 */
export function setSentryWallet(wallet: string | null | undefined): void {
  if (!initialised) return;
  if (!wallet) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: wallet.toLowerCase() });
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised) {
    console.error("[error]", err, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureException(err);
  });
}

export { Sentry };
