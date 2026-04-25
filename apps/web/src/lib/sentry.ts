import * as Sentry from "@sentry/react";

const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();

let initialised = false;

export function initSentry(): void {
  if (initialised) return;
  if (!DSN) {
    if (import.meta.env.DEV) {
      console.info("[sentry] no VITE_SENTRY_DSN set — skipping Sentry init");
    }
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE_TAG ?? undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
    ],
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

export function setSentryWallet(address: string | null | undefined): void {
  if (!initialised) return;
  if (!address) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: address.toLowerCase() });
}

export { Sentry };
