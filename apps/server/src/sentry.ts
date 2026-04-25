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
