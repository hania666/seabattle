import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n";

const AUTO_ADVANCE_MS = 3800;

/**
 * Full-screen animated intro. Shown on every fresh page load.
 * Leaves on: tap / ENTER key / ENTER button / auto-advance after 3.8 s.
 */
export function Splash({ onFinish }: { onFinish: () => void }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), AUTO_ADVANCE_MS - 500);
    const t2 = setTimeout(onFinish, AUTO_ADVANCE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        setLeaving(true);
        setTimeout(onFinish, 300);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFinish]);

  function skip() {
    setLeaving(true);
    setTimeout(onFinish, 300);
  }

  return (
    <div
      role="dialog"
      aria-label="SeaBattle intro"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#04233a] via-[#0b3a5a] to-[#0a527a] text-sea-50 transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Stars layer */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-white/80"
            style={{
              top: `${Math.random() * 55}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Waves at the bottom */}
      <svg
        aria-hidden
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full"
      >
        <defs>
          <linearGradient id="w1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#082f49" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="w2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          fill="url(#w2)"
          d="M0,96 C240,160 480,32 720,96 C960,160 1200,32 1440,96 L1440,240 L0,240 Z"
        >
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            values="
              M0,96 C240,160 480,32 720,96 C960,160 1200,32 1440,96 L1440,240 L0,240 Z;
              M0,112 C240,48 480,176 720,112 C960,48 1200,176 1440,112 L1440,240 L0,240 Z;
              M0,96 C240,160 480,32 720,96 C960,160 1200,32 1440,96 L1440,240 L0,240 Z"
          />
        </path>
        <path
          fill="url(#w1)"
          d="M0,136 C240,200 480,72 720,136 C960,200 1200,72 1440,136 L1440,240 L0,240 Z"
        >
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M0,136 C240,200 480,72 720,136 C960,200 1200,72 1440,136 L1440,240 L0,240 Z;
              M0,152 C240,96 480,216 720,152 C960,96 1200,216 1440,152 L1440,240 L0,240 Z;
              M0,136 C240,200 480,72 720,136 C960,200 1200,72 1440,136 L1440,240 L0,240 Z"
          />
        </path>
      </svg>

      {/* Ship hero */}
      <div className="relative z-10 animate-float-slow">
        <svg
          aria-hidden
          viewBox="0 0 320 200"
          className="h-48 w-80 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] sm:h-56 sm:w-96"
        >
          <defs>
            <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          {/* hull */}
          <path d="M40 120 L280 120 L260 160 L60 160 Z" fill="url(#hull)" stroke="#0f172a" strokeWidth="2" />
          {/* deck */}
          <rect x="80" y="100" width="160" height="24" fill="url(#deck)" stroke="#0f172a" strokeWidth="1.5" />
          {/* bridge */}
          <rect x="140" y="74" width="40" height="26" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
          <rect x="148" y="82" width="6" height="6" fill="#fbbf24" />
          <rect x="160" y="82" width="6" height="6" fill="#fbbf24" />
          {/* mast */}
          <line x1="160" y1="74" x2="160" y2="36" stroke="#cbd5e1" strokeWidth="2" />
          {/* flag */}
          <path d="M160 36 L190 42 L160 52 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
          {/* smokestack */}
          <rect x="120" y="84" width="10" height="18" fill="#1f2937" />
          <circle cx="122" cy="72" r="7" fill="#64748b" opacity="0.8">
            <animate attributeName="cy" values="72;60;72" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="118" cy="60" r="9" fill="#94a3b8" opacity="0.6">
            <animate attributeName="cy" values="60;40;60" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* cannons */}
          <rect x="200" y="108" width="40" height="6" fill="#334155" />
          <circle cx="240" cy="111" r="8" fill="#fbbf24" opacity="0.9">
            <animate attributeName="r" values="3;14;3" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <rect x="70" y="108" width="28" height="6" fill="#334155" />
          {/* waterline splashes */}
          <ellipse cx="60" cy="160" rx="24" ry="5" fill="#e0f2fe" opacity="0.7">
            <animate attributeName="rx" values="18;30;18" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="260" cy="160" rx="24" ry="5" fill="#e0f2fe" opacity="0.7">
            <animate attributeName="rx" values="18;30;18" dur="2s" begin="0.4s" repeatCount="indefinite" />
          </ellipse>
        </svg>
      </div>

      {/* Title */}
      <div className="relative z-10 mt-4 flex flex-col items-center">
        <h1 className="animate-fade-in font-display text-5xl font-bold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] sm:text-7xl">
          Sea<span className="text-gold-300">Battle</span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.5em] text-sea-200 sm:text-sm">
          {t("splash.tagline")}
        </p>
      </div>

      <button
        type="button"
        onClick={skip}
        className="relative z-10 mt-8 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-8 py-3 font-display text-sm font-bold uppercase tracking-[0.3em] text-sea-950 shadow-glow-gold transition hover:scale-105 hover:from-gold-300 hover:to-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300 sm:text-base"
      >
        {t("splash.enter")} →
      </button>

      <span className="relative z-10 mt-4 text-[10px] tracking-widest text-sea-300/80">
        or press Enter
      </span>

      {/* Keyframes injected locally — avoid polluting global CSS */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
