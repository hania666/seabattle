import { useEffect, useState } from "react";
import { markSplashSeen } from "./splashState";

/**
 * Intro animation shown once per browser session (or when explicitly reset).
 * Fades out on its own after ~1.6 s; the user can also click through.
 */
export function Splash({ onFinish }: { onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1600);
    const t2 = setTimeout(() => {
      markSplashSeen();
      onFinish();
    }, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  function skip() {
    setLeaving(true);
    setTimeout(() => {
      markSplashSeen();
      onFinish();
    }, 300);
  }

  return (
    <button
      type="button"
      onClick={skip}
      aria-label="Skip intro"
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-gradient-to-b from-sea-950 via-sea-900 to-sea-800 text-sea-50 transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-float-slow">
        <svg
          aria-hidden
          viewBox="0 0 160 160"
          className="h-28 w-28 drop-shadow-[0_0_30px_rgba(56,189,248,0.5)] sm:h-36 sm:w-36"
          fill="none"
        >
          <circle cx="80" cy="80" r="62" fill="#0ea5e9" opacity="0.2" />
          <circle cx="80" cy="80" r="62" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <circle cx="80" cy="80" r="46" stroke="#bae6fd" strokeWidth="1" opacity="0.4" />
          <path
            d="M40 92 L120 92 L108 112 L52 112 Z"
            fill="#e0f2fe"
            stroke="#082f49"
            strokeWidth="2"
          />
          <rect x="74" y="58" width="6" height="34" fill="#e0f2fe" />
          <path d="M80 58 L80 40 L102 52 L80 64" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
          <circle cx="80" cy="76" r="3" fill="#fbbf24" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Sea<span className="text-sea-300">3</span>Battle
      </h1>
      <p className="mt-2 text-xs uppercase tracking-[0.4em] text-sea-400 sm:text-sm">
        Stake · Play · Claim
      </p>
      <span className="mt-8 text-[11px] text-sea-500">tap to skip</span>
    </button>
  );
}
