import { useEffect, useState } from "react";
import { getSettings, setSettings, subscribeSettings, type Settings } from "../lib/settings";
import { sfx, startMusic, stopMusic } from "../lib/audio";
import { LANGS, setLang, useLang, useT, type Lang } from "../lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const t = useT();
  const lang = useLang();
  const [s, setS] = useState<Settings>(() => getSettings());

  useEffect(() => subscribeSettings(setS), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggleSfx(next: boolean) {
    setSettings({ sfxEnabled: next });
    if (next) sfx.click();
  }
  function toggleMusic(next: boolean) {
    setSettings({ musicEnabled: next });
    if (next) startMusic();
    else stopMusic();
  }
  function setVolume(v: number) {
    setSettings({ masterVolume: v });
  }
  function pickLang(next: Lang) {
    setLang(next);
    sfx.click();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sea-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,440px)] rounded-2xl border border-sea-500/40 bg-sea-900/90 p-6 shadow-arcade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl font-bold text-sea-50">{t("settings.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.close")}
            className="rounded-lg p-2 text-sea-300 hover:bg-sea-800/60 hover:text-sea-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sea-300">
              {t("settings.lang")}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LANGS.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => pickLang(l.code)}
                    aria-pressed={active}
                    className={`rounded-xl border px-2 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-gold-400/70 bg-gold-500/20 text-gold-100 shadow-glow-gold"
                        : "border-sea-700/60 bg-sea-950/40 text-sea-100 hover:border-sea-400/70"
                    }`}
                  >
                    <span className="mr-1" aria-hidden>
                      {l.flag}
                    </span>
                    <span className="uppercase">{l.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Toggle
            label={t("settings.sfx")}
            sub={t("settings.sfx.sub")}
            value={s.sfxEnabled}
            onChange={toggleSfx}
          />
          <Toggle
            label={t("settings.music")}
            sub={t("settings.music.sub")}
            value={s.musicEnabled}
            onChange={toggleMusic}
          />

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-sea-100">{t("settings.volume")}</span>
              <span className="text-sea-300 tabular-nums">{Math.round(s.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.masterVolume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="mt-2 w-full accent-gold-400"
              aria-label={t("settings.volume")}
            />
          </div>

          <div className="rounded-xl border border-sea-700/60 bg-sea-950/40 p-4 text-xs text-sea-300">
            {t("settings.note")}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-sea-700/60 bg-sea-950/40 p-4 transition hover:border-sea-500/60">
      <div>
        <div className="font-medium text-sea-100">{label}</div>
        {sub && <div className="text-xs text-sea-300/80">{sub}</div>}
      </div>
      <span
        role="switch"
        aria-checked={value}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-gradient-to-r from-gold-400 to-gold-500 shadow-glow-gold" : "bg-sea-700"
        }`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}
