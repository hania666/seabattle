import { Suspense, lazy, useState } from "react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";
import { shortAddress } from "./lib/format";
import { Splash } from "./features/splash/Splash";
import { splashSeen } from "./features/splash/splashState";
import { Hud } from "./components/Hud";
import { SettingsModal } from "./components/SettingsModal";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { Home } from "./features/home/Home";
import { sfx } from "./lib/audio";
import { useT } from "./lib/i18n";

const PveScreen = lazy(() =>
  import("./features/pve/PveScreen").then((m) => ({ default: m.PveScreen })),
);
const PvpScreen = lazy(() =>
  import("./features/pvp/PvpScreen").then((m) => ({ default: m.PvpScreen })),
);
const ProfileScreen = lazy(() =>
  import("./features/profile/ProfileScreen").then((m) => ({ default: m.ProfileScreen })),
);
const LeaderboardScreen = lazy(() =>
  import("./features/leaderboard/LeaderboardScreen").then((m) => ({
    default: m.LeaderboardScreen,
  })),
);
const ShopScreen = lazy(() =>
  import("./features/shop/ShopScreen").then((m) => ({ default: m.ShopScreen })),
);

type Screen = "home" | "pve" | "pvp" | "profile" | "leaderboard" | "shop";

export default function App() {
  const t = useT();
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [screen, setScreen] = useState<Screen>("home");
  const [showSplash, setShowSplash] = useState(() => !splashSeen());
  const [settingsOpen, setSettingsOpen] = useState(false);

  function goto(next: Screen) {
    sfx.click();
    setScreen(next);
  }

  return (
    <>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sea-800/60 bg-sea-950/70 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => goto("home")}
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-sea-50 hover:text-sea-200 sm:text-2xl"
            aria-label={`${t("brand.name")} ${t("nav.home")}`}
          >
            <LogoMark />
            {t("brand.name")}
          </button>
          <div className="flex items-center gap-2">
            <Hud />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setSettingsOpen(true);
              }}
              aria-label={t("nav.settings")}
              className="rounded-full bg-sea-900/60 p-2 text-sea-200 ring-1 ring-sea-700/60 hover:bg-sea-800/80 hover:text-sea-100"
            >
              <GearIcon />
            </button>
            <button
              type="button"
              onClick={() => goto("profile")}
              className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:inline-flex ${
                screen === "profile"
                  ? "bg-sea-800/70 text-sea-50"
                  : "text-sea-200 hover:bg-sea-800/40"
              }`}
              data-testid="nav-profile"
            >
              {t("nav.profile")}
            </button>
            {isConnected ? (
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-lg border border-sea-500/60 px-3 py-2 text-xs font-medium text-sea-100 hover:bg-sea-500/10 sm:text-sm"
                data-testid="disconnect-button"
              >
                <span className="font-mono">{shortAddress(address)}</span>
                <span className="hidden sm:inline"> · {t("nav.disconnect")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => login()}
                className="rounded-lg bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-sea-950 shadow-glow-gold hover:shadow-[0_0_32px_rgba(250,204,21,0.55)] sm:px-4 sm:text-sm"
                data-testid="connect-button"
              >
                {t("nav.connect")}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
          <Suspense fallback={<ScreenSpinner />}>
            {screen === "home" && (
              <Home
                onPvE={() => goto("pve")}
                onPvP={() => goto("pvp")}
                onProfile={() => goto("profile")}
                onLeaderboard={() => goto("leaderboard")}
                onShop={() => goto("shop")}
              />
            )}
            {screen === "pve" && <PveScreen onExit={() => goto("home")} />}
            {screen === "pvp" && <PvpScreen onExit={() => goto("home")} />}
            {screen === "profile" && (
              <ProfileScreen
                onExit={() => goto("home")}
                onPlayPvE={() => goto("pve")}
                onPlayPvP={() => goto("pvp")}
              />
            )}
            {screen === "leaderboard" && (
              <LeaderboardScreen onExit={() => goto("home")} />
            )}
            {screen === "shop" && <ShopScreen onExit={() => goto("home")} />}
          </Suspense>
        </main>

        <footer className="border-t border-sea-800/60 bg-sea-950/30 px-6 py-4 text-center text-xs text-sea-200/60">
          Built on Abstract · MIT licensed ·{" "}
          <a
            className="underline hover:text-sea-100"
            href="https://github.com/hania666/seabattle"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </footer>
      </div>
    </>
  );
}

function ScreenSpinner() {
  return (
    <div className="flex items-center justify-center py-24 text-sea-300">
      <div className="flex items-center gap-3 text-sm">
        <span className="h-2 w-2 animate-ping rounded-full bg-sea-300" />
        Loading…
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className="h-7 w-7 shrink-0"
      fill="none"
    >
      <rect width="64" height="64" rx="14" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" stroke="#38bdf8" strokeWidth="2" opacity="0.4" />
      <path d="M18 34 L46 34 L42 40 L22 40 Z" fill="#e0f2fe" stroke="#082f49" strokeWidth="1.5" />
      <rect x="30" y="22" width="4" height="12" fill="#e0f2fe" />
      <path d="M32 22 L32 14 L41 18 L32 22" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
      <circle cx="32" cy="28" r="1.6" fill="#fbbf24" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5">
      <path
        d="M10 2l1.2 2.4 2.6.4-1.9 1.9.4 2.6L10 8.1 7.7 9.3l.4-2.6L6.2 4.8l2.6-.4L10 2z"
        fill="currentColor"
        opacity="0.3"
      />
      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.5" />
      <path
        d="M10 1.5l1.8 3 3.4-.3-.3 3.4 3 1.8-3 1.8.3 3.4-3.4-.3L10 17.5l-1.8-3-3.4.3.3-3.4-3-1.8 3-1.8L4.8 4.2l3.4.3L10 1.5zm0 5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill="currentColor"
      />
    </svg>
  );
}
