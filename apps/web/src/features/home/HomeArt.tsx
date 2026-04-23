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
