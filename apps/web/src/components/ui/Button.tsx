import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-sea-300 text-sea-950 hover:bg-sea-200 disabled:bg-sea-700 disabled:text-sea-400",
  secondary:
    "border border-sea-400 text-sea-100 hover:bg-sea-400/10 disabled:border-sea-700 disabled:text-sea-500",
  ghost:
    "border border-sea-700 text-sea-200 hover:bg-sea-800 disabled:text-sea-600",
  danger:
    "bg-red-500 text-white hover:bg-red-400 disabled:bg-red-900 disabled:text-red-400",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
