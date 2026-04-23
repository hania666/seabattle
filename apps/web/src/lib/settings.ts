/**
 * Client-side settings (sound / music / volume). Persisted in localStorage,
 * distributed to listeners via a tiny pub/sub so React components can react
 * to changes without prop drilling a full context.
 */

export interface Settings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number; // 0..1
}

const KEY = "sea3battle:settings:v1";
const DEFAULT: Settings = {
  sfxEnabled: true,
  musicEnabled: false, // music off by default — respect "no auto-play" sensibilities
  masterVolume: 0.6,
};

type Listener = (s: Settings) => void;
const listeners = new Set<Listener>();
let current: Settings = load();

function load(): Settings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function persist(s: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(update: Partial<Settings>): Settings {
  current = { ...current, ...update };
  persist(current);
  listeners.forEach((l) => l(current));
  return current;
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
