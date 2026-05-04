import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { BackLink, Button, Card } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { useAuth } from "../../lib/useAuth";
import { useReferralCode } from "../../lib/useReferralCode";
import { SERVER_URL } from "../../lib/socket";
import { shortAddress } from "../../lib/format";

interface Props {
  onExit: () => void;
}

interface ReferralRow {
  referee: string;
  displayName: string | null;
  createdAt: string;
  xpEarned: number;
  coinsEarned: number;
  firstMatchAt: string | null;
}

interface ReferralsResponse {
  referrals: ReferralRow[];
  summary: {
    count: number;
    active: number;
    totalXpEarned: number;
    totalCoinsEarned: number;
  };
  program: {
    xpPercent: number;
    xpCapPerReferee: number;
    firstMatchCoins: number;
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function ReferralsScreen({ onExit }: Props) {
  const t = useT();
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { authedFetch, session } = useAuth();
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const wallet = session?.wallet ?? null;
  const {
    code: refCode,
    cooldownUntil: refCodeCooldownUntil,
    error: refCodeError,
    setCode: saveRefCode,
  } = useReferralCode(wallet ?? undefined, authedFetch);
  const [editingCode, setEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeSaving, setCodeSaving] = useState(false);
  const codeInputValid = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(codeInput);
  const refCodeCooldownActive = refCodeCooldownUntil
    ? new Date(refCodeCooldownUntil).getTime() > Date.now()
    : false;

  useEffect(() => {
    if (!wallet) {
      setData(null);
      return;
    }
    let cancelled = false;
    authedFetch(`${SERVER_URL}/api/referrals`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as ReferralsResponse;
      })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("load_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [wallet, authedFetch]);

  // Prefer the vanity code in invite URLs when set: it's shorter, brandable,
  // and doesn't expose the wallet. Falls back to the address so the link
  // always works, even before the user picks a code.
  const referralIdentifier = refCode ?? address ?? "";
  const referralUrl = referralIdentifier
    ? `${window.location.origin}?ref=${referralIdentifier}`
    : "";

  const copy = useCallback(() => {
    if (!referralUrl) return;
    void navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralUrl]);

  async function submitCode() {
    if (!codeInputValid || codeSaving) return;
    setCodeSaving(true);
    const ok = await saveRefCode(codeInput);
    setCodeSaving(false);
    if (ok) {
      setEditingCode(false);
      setCodeInput("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      <BackLink onClick={onExit} label={t("nav.home")} />
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sea-400">
          {t("referrals.eyebrow")}
        </p>
        <h2 className="font-display text-3xl text-sea-50 sm:text-4xl">
          {t("referrals.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-sea-300">
          {t("referrals.lead")}
        </p>
      </header>

      {!isConnected || !wallet ? (
        <Card>
          <p className="text-sm text-sea-300">{t("referrals.connectPrompt")}</p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => login()}>
              {t("nav.connect")}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <h3 className="font-display text-lg text-sea-50">
              {t("referrals.linkTitle")}
            </h3>
            <p className="mt-1 text-xs text-sea-400">
              {t("referrals.linkHelp")}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg border border-sea-700/60 bg-sea-900 px-3 py-2 text-xs text-sea-100">
                {referralUrl}
              </code>
              <Button variant="primary" onClick={copy} aria-label={t("referrals.copy")}>
                {copied ? t("referrals.copied") : t("referrals.copy")}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-sea-500">
              {t("referrals.codeLabel")}{" "}
              <span className="font-mono text-sea-200">
                {refCode ?? shortAddress(address)}
              </span>
            </p>

            <div className="mt-4 border-t border-sea-800/60 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
                    {t("refcode.label")}
                  </div>
                  <p className="mt-0.5 text-xs text-sea-300">{t("refcode.lead")}</p>
                </div>
                {!editingCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCode(true);
                      setCodeInput(refCode ?? "");
                    }}
                    disabled={refCodeCooldownActive}
                    className="shrink-0 rounded-lg border border-sea-600/60 px-3 py-1.5 text-xs font-semibold text-sea-100 hover:bg-sea-800/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {refCode ? t("refcode.change") : t("refcode.set")}
                  </button>
                )}
              </div>
              {editingCode && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submitCode()}
                    maxLength={20}
                    placeholder="hania111"
                    className="w-full rounded-lg border border-sea-700/60 bg-sea-900 px-3 py-2 text-sm text-sea-50 placeholder-sea-600 outline-none focus:border-gold-400/60"
                    autoFocus
                  />
                  <p className="text-[11px] text-sea-500">{t("refcode.help")}</p>
                  {refCodeError === "referral_code_cooldown" && (
                    <p className="text-xs text-coral-400">{t("refcode.error.cooldown")}</p>
                  )}
                  {refCodeError === "referral_code_taken" && (
                    <p className="text-xs text-coral-400">{t("refcode.error.taken")}</p>
                  )}
                  {refCodeError === "referral_code_reserved" && (
                    <p className="text-xs text-coral-400">{t("refcode.error.reserved")}</p>
                  )}
                  {refCodeError &&
                    ![
                      "referral_code_cooldown",
                      "referral_code_taken",
                      "referral_code_reserved",
                    ].includes(refCodeError) && (
                      <p className="text-xs text-coral-400">{t("refcode.error.generic")}</p>
                    )}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => void submitCode()}
                      disabled={!codeInputValid || codeSaving}
                    >
                      {codeSaving ? t("refcode.saving") : t("refcode.save")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCode(false);
                        setCodeInput("");
                      }}
                      className="rounded-lg border border-sea-700/60 px-3 py-1.5 text-xs font-semibold text-sea-200 hover:bg-sea-800/40"
                    >
                      {t("refcode.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
                {t("referrals.stat.invited")}
              </div>
              <div className="mt-1 font-display text-3xl font-bold text-sea-50">
                {data?.summary.count ?? 0}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
                {t("referrals.stat.xpEarned")}
              </div>
              <div className="mt-1 font-display text-3xl font-bold text-gold-300">
                {data?.summary.totalXpEarned ?? 0}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sea-400">
                {t("referrals.stat.coinsEarned")}
              </div>
              <div className="mt-1 font-display text-3xl font-bold text-gold-300">
                {data?.summary.totalCoinsEarned ?? 0}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-display text-lg text-sea-50">
              {t("referrals.program.title")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-sea-200">
              <li>
                ·{" "}
                {t("referrals.program.xp")
                  .replace("{{pct}}", String(data?.program.xpPercent ?? 10))
                  .replace("{{cap}}", String(data?.program.xpCapPerReferee ?? 1000))}
              </li>
              <li>
                ·{" "}
                {t("referrals.program.coins").replace(
                  "{{coins}}",
                  String(data?.program.firstMatchCoins ?? 100),
                )}
              </li>
            </ul>
          </Card>

          <Card>
            <h3 className="font-display text-lg text-sea-50">
              {t("referrals.list.title")}
            </h3>
            {error && (
              <p className="mt-2 text-xs text-coral-400">{t("referrals.list.error")}</p>
            )}
            {data && data.referrals.length === 0 && !error && (
              <p className="mt-2 text-sm text-sea-400">{t("referrals.list.empty")}</p>
            )}
            {data && data.referrals.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-sea-400">
                      <th className="py-2 pr-4">{t("referrals.list.col.captain")}</th>
                      <th className="py-2 pr-4">{t("referrals.list.col.joined")}</th>
                      <th className="py-2 pr-4">{t("referrals.list.col.firstMatch")}</th>
                      <th className="py-2 pr-4 text-right">XP</th>
                      <th className="py-2 text-right">Coins</th>
                    </tr>
                  </thead>
                  <tbody className="text-sea-100">
                    {data.referrals.map((r) => (
                      <tr key={r.referee} className="border-t border-sea-800/60">
                        <td className="py-2 pr-4">
                          {r.displayName ?? (
                            <span className="font-mono text-xs text-sea-300">
                              {shortAddress(r.referee)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs text-sea-400">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-2 pr-4 text-xs text-sea-400">
                          {r.firstMatchAt ? formatDate(r.firstMatchAt) : "—"}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-gold-300">
                          {r.xpEarned}
                        </td>
                        <td className="py-2 text-right font-semibold text-gold-300">
                          {r.coinsEarned}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
