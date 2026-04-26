import { FormEvent, useState } from "react";
import { useAccount } from "wagmi";
import { Sentry } from "../lib/sentry";
import { useT } from "../lib/i18n";

/**
 * Lightweight bug-report form. Submits as a Sentry breadcrumbed message so we
 * can track player-reported issues alongside ordinary error events.
 *
 * Why not Sentry's official feedback widget? Two reasons:
 *   - Bundle cost. Their `feedbackIntegration()` ships its own UI + theming
 *     and locks us out of i18n.
 *   - DX. We already have a styled modal pattern and Tailwind, so a plain
 *     form is cheaper and matches the rest of the UI.
 *
 * Captured event includes the connected wallet (if any) as user.id so we can
 * stitch reports to in-app sessions in Sentry's UI. Email is optional and
 * only attached if the user explicitly types one — we never harvest it.
 */

export interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "submitting" | "ok" | "error";

const MAX_MESSAGE = 1500;

export function FeedbackModal({ open, onClose }: FeedbackModalProps): JSX.Element | null {
  const t = useT();
  const { address } = useAccount();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function reset() {
    setMessage("");
    setEmail("");
    setStatus("idle");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setStatus("submitting");
    try {
      // Each report is a distinct Sentry event so they show up individually
      // rather than being merged by fingerprint into one issue.
      const eventId = Sentry.captureMessage("user_feedback", {
        level: "info",
        tags: {
          source: "in_app_feedback",
        },
        extra: {
          message: trimmed.slice(0, MAX_MESSAGE),
          email: email.trim() || undefined,
          wallet: address ?? null,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      });
      // Fire-and-forget flush — don't block the UI on the network roundtrip.
      void Sentry.flush(2000);
      setStatus("ok");
      // Auto-close after a short confirmation window so the user has time to
      // see the success message but doesn't have to dismiss it manually.
      window.setTimeout(handleClose, 1500);
      // Side-channel debug breadcrumb (no-op in production with no DSN).
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info("[feedback] captured", { eventId });
      }
    } catch (err) {
      setStatus("error");
      // eslint-disable-next-line no-console
      console.error("[feedback] capture failed", err);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("feedback.title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sea-950/80 px-4 py-6 backdrop-blur-sm"
      onClick={handleClose}
      data-testid="feedback-modal"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-sea-700/60 bg-sea-900/95 p-5 shadow-glow-cyan"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-sea-50">
            {t("feedback.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("feedback.close")}
            className="rounded p-1 text-sea-300 hover:bg-sea-800/60 hover:text-sea-100"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-xs text-sea-300/80">{t("feedback.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-sea-200/90">
            <span>{t("feedback.message.label")}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              required
              rows={4}
              placeholder={t("feedback.message.placeholder")}
              className="resize-y rounded-lg border border-sea-700 bg-sea-950/60 px-3 py-2 text-sm text-sea-50 placeholder:text-sea-500 focus:border-sea-500 focus:outline-none focus:ring-1 focus:ring-sea-500"
              data-testid="feedback-message"
            />
            <span className="text-right text-[10px] text-sea-500">
              {message.length}/{MAX_MESSAGE}
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs text-sea-200/90">
            <span>
              {t("feedback.email.label")}{" "}
              <span className="text-sea-500">{t("feedback.email.optional")}</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-sea-700 bg-sea-950/60 px-3 py-2 text-sm text-sea-50 placeholder:text-sea-500 focus:border-sea-500 focus:outline-none focus:ring-1 focus:ring-sea-500"
              data-testid="feedback-email"
            />
          </label>

          {address && (
            <p className="text-[10px] text-sea-400">
              {t("feedback.attached.wallet", { address })}
            </p>
          )}

          {status === "ok" && (
            <p className="text-xs text-sea-300" data-testid="feedback-success">
              {t("feedback.success")}
            </p>
          )}
          {status === "error" && (
            <p className="text-xs text-rose-300" data-testid="feedback-error">
              {t("feedback.error")}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-sea-200 hover:bg-sea-800/60"
            >
              {t("feedback.cancel")}
            </button>
            <button
              type="submit"
              disabled={status === "submitting" || message.trim() === ""}
              className="rounded-lg bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-sea-950 shadow-glow-gold hover:shadow-[0_0_24px_rgba(250,204,21,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="feedback-submit"
            >
              {status === "submitting" ? t("feedback.sending") : t("feedback.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
