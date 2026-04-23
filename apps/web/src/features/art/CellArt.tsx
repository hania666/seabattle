export type SegmentOrientation = "h" | "v";

interface SegmentProps {
  index: number;
  total: number;
  orientation: SegmentOrientation;
  sunk?: boolean;
}

/**
 * Continuous-looking ship hull made of per-cell SVG slices: rounded bow on
 * the first segment, rounded stern on the last, straight hull on the middle.
 * Rotates 90° for vertical ships.
 */
export function ShipSegment({ index, total, orientation, sunk }: SegmentProps) {
  const isBow = index === 0;
  const isStern = index === total - 1;
  const rotate = orientation === "v" ? "rotate(90 50 50)" : "";
  const hullFill = sunk ? "#4c1d1d" : "url(#hullGrad)";
  const deckFill = sunk ? "#57534e" : "url(#deckGrad)";

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="deckGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <g transform={rotate}>
        <Hull isBow={isBow} isStern={isStern} fill={hullFill} />
        <Deck isBow={isBow} isStern={isStern} fill={deckFill} />
        {!sunk && index === Math.floor(total / 2) && (
          <>
            {/* Bridge / tower in the middle segment */}
            <rect x="38" y="36" width="24" height="18" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
            <rect x="42" y="40" width="4" height="4" fill="#fbbf24" />
            <rect x="54" y="40" width="4" height="4" fill="#fbbf24" />
          </>
        )}
        {sunk && (
          <>
            <line x1="20" y1="50" x2="80" y2="50" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
          </>
        )}
      </g>
    </svg>
  );
}

function Hull({ isBow, isStern, fill }: { isBow: boolean; isStern: boolean; fill: string }) {
  if (isBow && isStern) {
    return (
      <path
        d="M10 60 Q10 40 30 40 L70 40 Q90 40 90 60 Q90 80 70 80 L30 80 Q10 80 10 60 Z"
        fill={fill}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    );
  }
  if (isBow) {
    return (
      <path
        d="M10 60 Q10 40 30 40 L100 40 L100 80 L30 80 Q10 80 10 60 Z"
        fill={fill}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    );
  }
  if (isStern) {
    return (
      <path
        d="M0 40 L70 40 Q90 40 90 60 Q90 80 70 80 L0 80 Z"
        fill={fill}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    );
  }
  return <rect x="0" y="40" width="100" height="40" fill={fill} stroke="#0f172a" strokeWidth="1.5" />;
}

function Deck({ isBow, isStern, fill }: { isBow: boolean; isStern: boolean; fill: string }) {
  if (isBow && isStern) {
    return <rect x="20" y="48" width="60" height="24" fill={fill} opacity="0.85" />;
  }
  if (isBow) {
    return <rect x="20" y="48" width="80" height="24" fill={fill} opacity="0.85" />;
  }
  if (isStern) {
    return <rect x="0" y="48" width="80" height="24" fill={fill} opacity="0.85" />;
  }
  return <rect x="0" y="48" width="100" height="24" fill={fill} opacity="0.85" />;
}

/** Water ripple placeholder for unknown / empty cells on the attack grid. */
export function WaterCell() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
      <path
        d="M10 55 Q25 45 40 55 T70 55 T100 55"
        stroke="#7dd3fc"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M0 72 Q15 64 30 72 T60 72 T90 72"
        stroke="#38bdf8"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** White splash marker for a confirmed miss. */
export function MissCell() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx="50" cy="50" r="18" fill="#e0f2fe" opacity="0.25" />
      <circle cx="50" cy="50" r="10" fill="#f0f9ff" opacity="0.6" />
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <line x1="50" y1="22" x2="50" y2="30" />
        <line x1="50" y1="70" x2="50" y2="78" />
        <line x1="22" y1="50" x2="30" y2="50" />
        <line x1="70" y1="50" x2="78" y2="50" />
        <line x1="30" y1="30" x2="36" y2="36" />
        <line x1="64" y1="30" x2="70" y2="36" />
        <line x1="30" y1="70" x2="36" y2="64" />
        <line x1="64" y1="70" x2="70" y2="64" />
      </g>
    </svg>
  );
}

/** Red explosion for a direct hit. */
export function HitCell() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="boom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="38" fill="url(#boom)">
        <animate attributeName="r" values="30;42;36" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <g fill="#fde68a" stroke="#b45309" strokeWidth="1" strokeLinejoin="round">
        <path d="M50 16 L58 40 L82 38 L62 54 L72 78 L50 66 L28 78 L38 54 L18 38 L42 40 Z" />
      </g>
    </svg>
  );
}

/** Sunken burning ship — combines fire and smoke. */
export function SunkCell() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <path
        d="M50 20 C60 34 70 42 66 56 C62 70 76 72 68 86 L32 86 C24 72 38 70 34 56 C30 42 40 34 50 20 Z"
        fill="url(#flame)"
      >
        <animate
          attributeName="d"
          dur="1.3s"
          repeatCount="indefinite"
          values="
            M50 20 C60 34 70 42 66 56 C62 70 76 72 68 86 L32 86 C24 72 38 70 34 56 C30 42 40 34 50 20 Z;
            M50 24 C58 36 72 44 64 56 C60 70 74 74 66 86 L34 86 C26 74 40 70 36 56 C30 44 42 36 50 24 Z;
            M50 20 C60 34 70 42 66 56 C62 70 76 72 68 86 L32 86 C24 72 38 70 34 56 C30 42 40 34 50 20 Z"
        />
      </path>
      <circle cx="50" cy="42" r="6" fill="#fde68a">
        <animate attributeName="r" values="4;8;4" dur="1s" repeatCount="indefinite" />
      </circle>
      <path d="M40 88 L60 88 L56 94 L44 94 Z" fill="#0f172a" opacity="0.7" />
    </svg>
  );
}
