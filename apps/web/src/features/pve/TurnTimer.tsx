import { useEffect, useRef, useState } from "react";

interface Props {
  /** Whether the timer should tick down now. Otherwise it freezes. */
  active: boolean;
  /** Total seconds per turn. */
  seconds: number;
  /** Label below the countdown (e.g. "Your turn"). */
  label: string;
  /** Fired once when the countdown hits 0 while active. */
  onExpire: () => void;
  /**
   * Any string that changes to force a timer reset — pass the turn id so we
   * restart the countdown whenever the turn changes, even if `active` stays
   * true (e.g. between consecutive hits).
   */
  resetKey: string;
}

/**
 * Ring-style countdown timer. Visible only during the player's turn; freezes
 * while the bot is thinking so waiting doesn't punish the player.
 */
export function TurnTimer({ active, seconds, label, onExpire, resetKey }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    setRemaining(seconds);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            // Defer so we don't mutate parent state mid-tick.
            setTimeout(onExpire, 0);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, onExpire]);

  const pct = Math.max(0, Math.min(1, remaining / seconds));
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  const low = remaining <= 5 && active;
  const color = !active
    ? "#475569"
    : low
      ? "#f43f5e"
      : remaining <= 10
        ? "#fbbf24"
        : "#38bdf8";

  return (
    <div
      className={`flex items-center gap-2 ${low ? "animate-pulse" : ""}`}
      role="timer"
      aria-live="off"
      aria-label={`${label} — ${remaining} seconds remaining`}
      data-testid="turn-timer"
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.8)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="font-display"
          fontSize="18"
          fontWeight="700"
          fill={active ? "#e0f2fe" : "#64748b"}
          transform={`rotate(90 ${size / 2} ${size / 2})`}
        >
          {remaining}
        </text>
      </svg>
      <div className="hidden flex-col text-[10px] uppercase tracking-[0.2em] text-sea-400 sm:flex">
        <span>Turn</span>
        <span className="text-sea-200">{label}</span>
      </div>
    </div>
  );
}
