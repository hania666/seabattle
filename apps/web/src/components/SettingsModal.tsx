import { useEffect, useState } from "react";
import { getSettings, setSettings, subscribeSettings, type Settings } from "../lib/settings";
import { sfx, startMusic, stopMusic } from "../lib/audio";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-sea-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,420px)] rounded-2xl border border-sea-500/40 bg-sea-900/90 p-6 shadow-arcade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl font-bold text-sea-50">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-2 text-sea-300 hover:bg-sea-800/60 hover:text-sea-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <Toggle
            label="Sound effects"
            sub="Shots, explosions, alerts"
            value={s.sfxEnabled}
            onChange={toggleSfx}
          />
          <Toggle
            label="Background music"
            sub="Ambient synth loop"
            value={s.musicEnabled}
            onChange={toggleMusic}
          />

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-sea-100">Master volume</span>
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
              aria-label="Master volume"
            />
          </div>

          <div className="rounded-xl border border-sea-700/60 bg-sea-950/40 p-4 text-xs text-sea-300">
            Sound uses Web Audio synthesis — nothing is downloaded. If you don't hear anything
            after toggling on, click somewhere on the page once (browsers require a gesture
            before audio can start).
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
