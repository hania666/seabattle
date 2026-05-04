import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n";
import { useAuth } from "../../lib/useAuth";
import { useReferralCode } from "../../lib/useReferralCode";

interface Props {
  wallet: string;
}

function formatRelative(t: (k: string) => string, iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return t("refcode.cooldown.ready");
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return t("refcode.cooldown.minutes").replace("{{n}}", String(mins));
  const hours = Math.ceil(mins / 60);
  if (hours < 24) return t("refcode.cooldown.hours").replace("{{n}}", String(hours));
  const days = Math.ceil(hours / 24);
  return t("refcode.cooldown.days").replace("{{n}}", String(days));
}

/**
 * Edits the user's vanity referral code (the part after `?ref=` in their
 * invite link). Decoupled from the username row so a user can hide their
 * nickname while still publishing a brandable invite — channel admins
 * specifically asked for this.
 *
 * Mirrors `UsernameRow` shape: a 24h server-enforced cooldown gates
 * changes, and we mirror the window in the UI to disable the button
 * without an extra round-trip. The hook talks to PUT /api/profile/referral-code.
 */
export function ReferralCodeRow({ wallet }: Props) {
  const t = useT();
  const { authedFetch } = useAuth();
  const { code, cooldownUntil, error, setCode } = useReferralCode(wallet, authedFetch);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cooldownActive = cooldownUntil
    ? new Date(cooldownUntil).getTime() > now
    : false;
  const valid = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(value);

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    const ok = await setCode(value);
    setSaving(false);
    if (ok) {
      setEditing(false);
      setValue("");
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-sea-700/60 bg-sea-900/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
            {t("refcode.label")}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-sea-50">
            {code ?? <span className="text-sea-500">{t("refcode.notSet")}</span>}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setValue(code ?? "");
            }}
            disabled={cooldownActive}
            className="shrink-0 rounded-lg border border-sea-600/60 px-3 py-1.5 text-xs font-semibold text-sea-100 hover:bg-sea-800/40 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="refcode-edit-button"
          >
            {code ? t("refcode.change") : t("refcode.set")}
          </button>
        )}
      </div>
      {!editing && cooldownActive && cooldownUntil && (
        <p className="mt-1 text-[11px] text-sea-400">
          {t("refcode.cooldown.next").replace("{{when}}", formatRelative(t, cooldownUntil))}
        </p>
      )}
      {editing && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            maxLength={20}
            placeholder="hania111"
            className="w-full rounded-lg border border-sea-700/60 bg-sea-900 px-3 py-2 text-sm text-sea-50 placeholder-sea-600 outline-none focus:border-gold-400/60"
            autoFocus
          />
          <p className="text-[11px] text-sea-500">{t("refcode.help")}</p>
          {error === "referral_code_cooldown" && (
            <p className="text-xs text-coral-400">{t("refcode.error.cooldown")}</p>
          )}
          {error === "referral_code_taken" && (
            <p className="text-xs text-coral-400">{t("refcode.error.taken")}</p>
          )}
          {error === "referral_code_reserved" && (
            <p className="text-xs text-coral-400">{t("refcode.error.reserved")}</p>
          )}
          {error &&
            !["referral_code_cooldown", "referral_code_taken", "referral_code_reserved"].includes(
              error,
            ) && (
              <p className="text-xs text-coral-400">{t("refcode.error.generic")}</p>
            )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!valid || saving}
              className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-sea-950 transition hover:bg-gold-400 disabled:opacity-50"
            >
              {saving ? t("refcode.saving") : t("refcode.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue("");
              }}
              className="rounded-lg border border-sea-700/60 px-3 py-1.5 text-xs font-semibold text-sea-200 hover:bg-sea-800/40"
            >
              {t("refcode.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
