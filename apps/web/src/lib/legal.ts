/**
 * Consent state — tracks whether the user has accepted Terms of Service,
 * Privacy Policy, and affirmed they are 18+. Persisted in localStorage so
 * the gate only shows once per browser.
 *
 * We also record a revision string; if we ever change the legal text in a
 * material way, bumping `CURRENT_CONSENT_VERSION` forces everyone to re-accept.
 */

import { useSyncExternalStore } from "react";

const LS_KEY = "seabattle:consent:v1";

/** Bump this string when ToS / Privacy are updated in a material way. */
export const CURRENT_CONSENT_VERSION = "2025-04-22";

export type ConsentRecord = {
  version: string;
  age18: boolean;
  tos: boolean;
  privacy: boolean;
  acceptedAt: number;
};

type Listener = (value: ConsentRecord | null) => void;
const listeners = new Set<Listener>();
let current: ConsentRecord | null = load();

function load(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CURRENT_CONSENT_VERSION) return null;
    if (!parsed.age18 || !parsed.tos || !parsed.privacy) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(value: ConsentRecord | null) {
  current = value;
  try {
    if (value) {
      window.localStorage.setItem(LS_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(LS_KEY);
    }
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn(current));
}

export function getConsent(): ConsentRecord | null {
  return current;
}

export function hasConsent(): boolean {
  return current !== null;
}

export function acceptConsent(): ConsentRecord {
  const record: ConsentRecord = {
    version: CURRENT_CONSENT_VERSION,
    age18: true,
    tos: true,
    privacy: true,
    acceptedAt: Date.now(),
  };
  save(record);
  return record;
}

export function revokeConsent() {
  save(null);
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot() {
  return current;
}

export function useConsent(): ConsentRecord | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
