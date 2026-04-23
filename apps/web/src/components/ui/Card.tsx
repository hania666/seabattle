import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
}

const PAD = { sm: "p-4", md: "p-6", lg: "p-8" } as const;

export function Card({ children, className, padding = "md", ...rest }: Props) {
  return (
    <div
      {...rest}
      className={[
        "rounded-2xl border border-sea-700/60 bg-sea-900/60",
        PAD[padding],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

interface StatusCardProps {
  title: string;
  children: ReactNode;
  tone?: "default" | "danger" | "success";
}

export function StatusCard({ title, children, tone = "default" }: StatusCardProps) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/40 bg-red-950/40"
      : tone === "success"
        ? "border-sea-400/40 bg-sea-800/60"
        : "border-sea-700/60 bg-sea-900/60";
  return (
    <div
      className={`mx-auto max-w-md space-y-3 rounded-2xl border p-8 text-center ${toneClass}`}
    >
      <h2 className="font-display text-2xl text-sea-50">{title}</h2>
      {children}
    </div>
  );
}
