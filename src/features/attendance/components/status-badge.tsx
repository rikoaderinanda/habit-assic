import { BookOpenCheck, CircleDashed, CircleMinus, Clock, User, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import { DAY_STATE_LABEL } from "../lib/labels";
import type { DayState } from "../lib/stats";

const STYLES: Record<DayState, { className: string; icon: typeof Users }> = {
  JAMAAH: { className: "bg-chart-1/12 text-secondary-foreground border-chart-1/25", icon: Users },
  SENDIRI: { className: "bg-chart-2/15 text-warning-foreground border-chart-2/30", icon: User },
  HADIR: {
    className: "bg-chart-1/12 text-secondary-foreground border-chart-1/25",
    icon: BookOpenCheck,
  },
  MISSED: { className: "bg-muted text-muted-foreground border-border", icon: CircleMinus },
  PENDING: {
    className: "bg-background text-muted-foreground border-dashed border-primary/40",
    icon: Clock,
  },
  OUTSIDE: {
    className: "bg-background text-muted-foreground/70 border-border",
    icon: CircleDashed,
  },
  OFF: { className: "bg-background text-muted-foreground/70 border-border", icon: CircleDashed },
  FUTURE: { className: "bg-background text-muted-foreground/70 border-border", icon: CircleDashed },
};

/** Status is always icon + label, never color alone. */
export function StatusBadge({ state, className }: { state: DayState; className?: string }) {
  const { className: tone, icon: Icon } = STYLES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {DAY_STATE_LABEL[state]}
    </span>
  );
}
