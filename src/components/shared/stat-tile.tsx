import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  jamaah: "bg-chart-1",
  sendiri: "bg-chart-2",
  missed: "bg-chart-3",
  neutral: "bg-foreground/20",
} as const;

export type StatTone = keyof typeof TONES;

/** Stat tile: label in muted ink, value in primary ink, a small swatch carries identity. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-xs", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon ? (
          <Icon className="size-3.5" aria-hidden />
        ) : (
          <span className={cn("size-2.5 rounded-full", TONES[tone])} aria-hidden />
        )}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
