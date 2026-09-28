import type { ProgramKind } from "@prisma/client";

import { formatDateWithWeekday, mondayIndex } from "@/lib/date";
import { cn } from "@/lib/utils";

import { DAY_STATE_LABEL } from "../lib/labels";
import type { DayState, MonthlyStats } from "../lib/stats";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const CELL: Record<DayState, string> = {
  JAMAAH: "bg-chart-1 text-white font-semibold",
  SENDIRI: "bg-chart-2 text-amber-950 font-semibold", // white on amber is only 2.5:1
  HADIR: "bg-chart-1 text-white font-semibold",
  MISSED: "bg-chart-3/45 text-foreground/70",
  PENDING: "border-2 border-dashed border-primary/50 text-primary font-semibold",
  OUTSIDE: "text-muted-foreground",
  OFF: "text-muted-foreground/60",
  FUTURE: "text-muted-foreground",
};

const LEGEND: Record<ProgramKind, Array<{ state: DayState; swatch: string }>> = {
  SHALAT: [
    { state: "JAMAAH", swatch: "bg-chart-1" },
    { state: "SENDIRI", swatch: "bg-chart-2" },
    { state: "MISSED", swatch: "bg-chart-3/45" },
    { state: "PENDING", swatch: "border-2 border-dashed border-primary/50" },
  ],
  TADARUS: [
    { state: "HADIR", swatch: "bg-chart-1" },
    { state: "MISSED", swatch: "bg-chart-3/45" },
    { state: "PENDING", swatch: "border-2 border-dashed border-primary/50" },
    { state: "OFF", swatch: "border border-border" },
  ],
};

/**
 * Month grid, Monday first. Visually a grid; semantically an ordered list of
 * days, each announcing its full date and state (no keyboard grid needed).
 */
export function MonthCalendar({
  stats,
  kind = "SHALAT",
  className,
}: {
  stats: MonthlyStats;
  kind?: ProgramKind;
  className?: string;
}) {
  const leading = mondayIndex(stats.days[0].date);

  return (
    <div className={cn("mx-auto w-full max-w-sm", className)}>
      <div
        className="grid grid-cols-7 gap-1.5 pb-1 text-center text-[11px] font-medium text-muted-foreground"
        aria-hidden
      >
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1.5 text-center" aria-label="Kalender laporan">
        {Array.from({ length: leading }, (_, i) => (
          <li key={`pad-${i}`} aria-hidden />
        ))}
        {stats.days.map((day) => (
          <li
            key={day.key}
            title={`${formatDateWithWeekday(day.date)} — ${DAY_STATE_LABEL[day.state]}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums sm:rounded-xl",
              CELL[day.state],
            )}
          >
            <span aria-hidden>{day.date.getUTCDate()}</span>
            <span className="sr-only">
              {formatDateWithWeekday(day.date)}: {DAY_STATE_LABEL[day.state]}
            </span>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {LEGEND[kind].map(({ state, swatch }) => (
          <li key={state} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded", swatch)} aria-hidden />
            {DAY_STATE_LABEL[state]}
          </li>
        ))}
      </ul>
    </div>
  );
}
