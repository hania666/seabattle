const REF_KEY = "seabattle:ref";

export function saveRef(ref: string): void {
  if (/^0x[a-fA-F0-9]{40}$/.test(ref)) {
    localStorage.setItem(REF_KEY, ref.toLowerCase());
  }
}

export function getRef(): string | null {
  return localStorage.getItem(REF_KEY);
}

export function clearRef(): void {
  localStorage.removeItem(REF_KEY);
}
