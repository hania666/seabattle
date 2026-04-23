const SEEN_KEY = "sea3battle:splash-seen";

export function splashSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage blocked — ignore */
  }
}
