import { useState } from "react";

interface Props {
  onSave: (name: string) => Promise<boolean>;
  onSkip?: () => void;
}

export function UsernameModal({ onSave, onSkip }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(value);

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const ok = await onSave(value);
    if (!ok) setError("Username already taken or invalid.");
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-sea-700/60 bg-sea-950 p-6 shadow-2xl">
        <h2 className="font-display text-2xl text-sea-50">Choose your callsign</h2>
        <p className="mt-1 text-sm text-sea-400">
          3–20 characters · letters, digits, underscores · must start with a letter
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          maxLength={20}
          placeholder="CaptainAhab"
          className="mt-4 w-full rounded-lg border border-sea-700/60 bg-sea-900 px-4 py-2.5 text-sea-50 placeholder-sea-600 outline-none focus:border-gold-400/60"
          autoFocus
        />
        {error && <p className="mt-2 text-xs text-coral-400">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!valid || saving}
            className="flex-1 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-sea-950 transition hover:bg-gold-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-lg border border-sea-700/60 px-4 py-2.5 text-sm text-sea-400 hover:text-sea-200"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
