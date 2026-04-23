/**
 * Decorative SVG illustrations used on the home hero. Everything is inline
 * SVG (no external images) — sized via Tailwind classes on the wrapper.
 */

export function SubmarineArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 160"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="subBody" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="subWater" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,189,248,0.1)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0)" />
        </linearGradient>
      </defs>
      <rect width="240" height="160" fill="url(#subWater)" rx="24" />
      {/* Bubbles */}
      <g>
        <circle cx="40" cy="110" r="4" fill="#e0f2fe" opacity="0.7">
          <animate attributeName="cy" from="120" to="20" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="55" cy="130" r="3" fill="#e0f2fe" opacity="0.6">
          <animate attributeName="cy" from="140" to="30" dur="5s" repeatCount="indefinite" begin="0.6s" />
          <animate attributeName="opacity" values="0;0.7;0" dur="5s" repeatCount="indefinite" begin="0.6s" />
        </circle>
        <circle cx="30" cy="125" r="2" fill="#e0f2fe" opacity="0.6">
          <animate attributeName="cy" from="135" to="25" dur="4.5s" repeatCount="indefinite" begin="1.4s" />
          <animate attributeName="opacity" values="0;0.6;0" dur="4.5s" repeatCount="indefinite" begin="1.4s" />
        </circle>
      </g>
      {/* Submarine body */}
      <g transform="translate(60 60)">
        <ellipse cx="70" cy="40" rx="70" ry="22" fill="url(#subBody)" />
        <rect x="55" y="12" width="30" height="24" rx="4" fill="#fbbf24" />
        <rect x="58" y="14" width="24" height="8" rx="2" fill="#082f49" />
        {/* Periscope */}
        <rect x="68" y="0" width="4" height="14" fill="#64748b" />
        <rect x="64" y="-2" width="12" height="4" rx="1" fill="#94a3b8" />
        {/* Portholes */}
        <circle cx="20" cy="40" r="5" fill="#082f49" />
        <circle cx="20" cy="40" r="3" fill="#38bdf8" />
        <circle cx="45" cy="42" r="5" fill="#082f49" />
        <circle cx="45" cy="42" r="3" fill="#fcd34d" />
        <circle cx="95" cy="42" r="5" fill="#082f49" />
        <circle cx="95" cy="42" r="3" fill="#fcd34d" />
        <circle cx="120" cy="42" r="5" fill="#082f49" />
        <circle cx="120" cy="42" r="3" fill="#38bdf8" />
        {/* Propeller */}
        <circle cx="-4" cy="40" r="10" fill="#64748b" />
        <path d="M-4,30 L-4,50 M-14,40 L6,40" stroke="#e2e8f0" strokeWidth="3">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 -4 40"
            to="360 -4 40"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
}

export function CarrierArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 260 160"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="carrierHull" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="carrierSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(250,204,21,0.2)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0.1)" />
        </linearGradient>
      </defs>
      <rect width="260" height="160" fill="url(#carrierSky)" rx="24" />
      {/* Clouds */}
      <g fill="#e2e8f0" opacity="0.85">
        <ellipse cx="40" cy="30" rx="18" ry="6" />
        <ellipse cx="55" cy="28" rx="12" ry="5" />
        <ellipse cx="200" cy="40" rx="22" ry="7" />
        <ellipse cx="220" cy="38" rx="14" ry="5" />
      </g>
      {/* Carrier */}
      <g transform="translate(20 80)">
        <path
          d="M0 30 L220 30 L230 45 L10 55 Z"
          fill="url(#carrierHull)"
          stroke="#0f172a"
          strokeWidth="1.5"
        />
        {/* Deck */}
        <rect x="20" y="22" width="180" height="10" fill="#334155" />
        <path d="M25 22 L195 22 L200 30 L20 30 Z" fill="#475569" />
        {/* Deck stripes */}
        <line x1="40" y1="27" x2="180" y2="27" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        {/* Island (command tower) */}
        <rect x="140" y="2" width="24" height="20" fill="#475569" />
        <rect x="144" y="6" width="16" height="4" fill="#082f49" />
        <rect x="148" y="-6" width="3" height="8" fill="#64748b" />
        <rect x="146" y="-10" width="7" height="4" fill="#cbd5e1" />
        {/* Fighter on deck */}
        <g transform="translate(60 14)">
          <path d="M0,6 L16,4 L22,6 L16,8 Z" fill="#1e293b" />
          <path d="M4,6 L4,2 L8,2 L8,6" stroke="#1e293b" strokeWidth="1" fill="#1e293b" />
          <path d="M4,10 L4,14 L8,14 L8,10" stroke="#1e293b" strokeWidth="1" fill="#1e293b" />
        </g>
        <g transform="translate(90 14)">
          <path d="M0,6 L16,4 L22,6 L16,8 Z" fill="#334155" />
        </g>
        {/* Waterline */}
        <path
          d="M0 58 Q30 62 60 58 T120 58 T180 58 T240 58 L240 70 L0 70 Z"
          fill="#0ea5e9"
          opacity="0.4"
        />
      </g>
    </svg>
  );
}

export function SeagullArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 30"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 15 Q12 2 22 15 Q32 2 42 15 Q50 10 58 14"
        stroke="#e0f2fe"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * War scene with continuous cannon-fire flashes from a shore battery, a
 * silhouetted warship trading volleys, tracer arcs overhead. Purely cosmetic
 * — sits in the gap under the hero. Uses SMIL animations (no CSS keyframes
 * needed) so the whole scene is self-contained.
 */
export function WarSceneArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 420 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wsSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(250,204,21,0.15)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0)" />
        </linearGradient>
        <linearGradient id="wsSea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
        <radialGradient id="wsFlash" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="rgba(220,38,38,0)" />
        </radialGradient>
      </defs>
      <rect width="420" height="140" fill="url(#wsSky)" rx="18" />
      {/* Sea */}
      <path
        d="M0 95 Q60 88 120 95 T240 95 T360 95 T420 95 L420 140 L0 140 Z"
        fill="url(#wsSea)"
      />
      {/* Enemy silhouette ship on the right */}
      <g transform="translate(290 70)">
        <path d="M0 22 L92 22 L98 30 L6 34 Z" fill="#111827" />
        <rect x="20" y="10" width="16" height="12" fill="#1f2937" />
        <rect x="50" y="6" width="8" height="16" fill="#1f2937" />
        <rect x="54" y="-2" width="2" height="8" fill="#1f2937" />
        {/* Gun flash from enemy */}
        <g transform="translate(10 12)">
          <circle cx="0" cy="0" r="7" fill="url(#wsFlash)" opacity="0">
            <animate attributeName="opacity" values="0;0.95;0" dur="3s" repeatCount="indefinite" begin="1.7s" />
            <animate attributeName="r" values="2;12;2" dur="3s" repeatCount="indefinite" begin="1.7s" />
          </circle>
        </g>
      </g>
      {/* Our shore battery on the left */}
      <g transform="translate(40 60)">
        <rect x="0" y="20" width="70" height="20" fill="#1f2937" rx="3" />
        <rect x="0" y="14" width="70" height="8" fill="#374151" rx="2" />
        {/* Turrets */}
        <rect x="10" y="6" width="12" height="10" fill="#0f172a" rx="1.5" />
        <rect x="42" y="6" width="12" height="10" fill="#0f172a" rx="1.5" />
        <rect x="21" y="9" width="20" height="3" fill="#0f172a" />
        <rect x="53" y="9" width="20" height="3" fill="#0f172a" />
        {/* Flashes */}
        <g>
          <circle cx="72" cy="11" r="6" fill="url(#wsFlash)" opacity="0">
            <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="r" values="2;13;2" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="11" r="5" fill="url(#wsFlash)" opacity="0">
            <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" begin="1.3s" />
            <animate attributeName="r" values="2;10;2" dur="2.6s" repeatCount="indefinite" begin="1.3s" />
          </circle>
        </g>
      </g>
      {/* Tracer arc (shell trajectory) */}
      <g fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 6">
        <path d="M120 62 Q210 10 300 70">
          <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" begin="0.2s" />
        </path>
        <path d="M306 70 Q220 20 140 62" stroke="#f97316">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="1.9s" />
        </path>
      </g>
      {/* Water splashes from impacts */}
      <g fill="#e0f2fe" opacity="0.9">
        <g transform="translate(300 85)">
          <path d="M-4 10 L0 -10 L4 10 Z" opacity="0">
            <animate attributeName="opacity" values="0;0.9;0" dur="2.6s" repeatCount="indefinite" begin="0.9s" />
          </path>
        </g>
        <g transform="translate(118 92)">
          <path d="M-4 10 L0 -10 L4 10 Z" opacity="0">
            <animate attributeName="opacity" values="0;0.9;0" dur="3s" repeatCount="indefinite" begin="2.6s" />
          </path>
        </g>
      </g>
    </svg>
  );
}

/**
 * Biplane/recon aircraft that glides across the hero every few seconds,
 * leaving a thin vapour trail. Absolute-positioned, so the parent controls
 * where it sits.
 */
export function PlaneArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Vapour trail */}
      <line
        x1="0"
        y1="22"
        x2="70"
        y2="22"
        stroke="#e0f2fe"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 5"
        opacity="0.7"
      />
      {/* Fuselage */}
      <path d="M70 18 L100 18 L112 22 L100 26 L70 26 Z" fill="#475569" />
      {/* Top wing */}
      <rect x="72" y="12" width="22" height="4" fill="#64748b" rx="1" />
      {/* Bottom wing */}
      <rect x="72" y="28" width="22" height="4" fill="#64748b" rx="1" />
      <line x1="82" y1="16" x2="82" y2="28" stroke="#0f172a" strokeWidth="1" />
      {/* Cockpit */}
      <rect x="86" y="15" width="8" height="6" fill="#0f172a" rx="1" />
      {/* Propeller */}
      <circle cx="113" cy="22" r="2" fill="#0f172a" />
      <line x1="113" y1="14" x2="113" y2="30" stroke="#e2e8f0" strokeWidth="1.5">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 113 22"
          to="360 113 22"
          dur="0.35s"
          repeatCount="indefinite"
        />
      </line>
      {/* Roundel */}
      <circle cx="82" cy="22" r="2.2" fill="#fbbf24" stroke="#7c2d12" strokeWidth="0.7" />
    </svg>
  );
}

/**
 * Small torpedo with bubble wake, travels horizontally. CSS-driven by parent
 * (the anim-torpedo class), the SVG itself is static.
 */
export function TorpedoArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 20"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wake bubbles */}
      <circle cx="4" cy="10" r="2" fill="#e0f2fe" opacity="0.7" />
      <circle cx="12" cy="13" r="1.5" fill="#e0f2fe" opacity="0.6" />
      <circle cx="20" cy="9" r="1.6" fill="#e0f2fe" opacity="0.6" />
      <circle cx="28" cy="11" r="1.2" fill="#e0f2fe" opacity="0.5" />
      {/* Body */}
      <rect x="35" y="7" width="34" height="6" rx="3" fill="#1f2937" />
      {/* Warhead */}
      <path d="M69 7 L75 10 L69 13 Z" fill="#b91c1c" />
      {/* Fin */}
      <path d="M35 7 L30 4 L35 10 Z" fill="#374151" />
      <path d="M35 13 L30 16 L35 10 Z" fill="#374151" />
    </svg>
  );
}

export function CompassArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="compassGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#compassGrad)" stroke="#7c2d12" strokeWidth="3" />
      <circle cx="50" cy="50" r="36" fill="#082f49" stroke="#fcd34d" strokeWidth="1" />
      {/* Cardinal marks */}
      <g stroke="#fcd34d" strokeWidth="1.4">
        <line x1="50" y1="18" x2="50" y2="26" />
        <line x1="50" y1="74" x2="50" y2="82" />
        <line x1="18" y1="50" x2="26" y2="50" />
        <line x1="74" y1="50" x2="82" y2="50" />
      </g>
      <text x="50" y="16" textAnchor="middle" fontSize="8" fill="#fcd34d" fontWeight="bold">
        N
      </text>
      {/* Needle */}
      <g>
        <path d="M50 24 L56 50 L50 46 L44 50 Z" fill="#f43f5e" />
        <path d="M50 76 L56 50 L50 54 L44 50 Z" fill="#e2e8f0" />
        <circle cx="50" cy="50" r="3" fill="#fbbf24" stroke="#7c2d12" strokeWidth="1" />
      </g>
    </svg>
  );
}
