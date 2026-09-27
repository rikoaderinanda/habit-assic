/**
 * Pure attendance statistics (no I/O) — shared by the user pages and the admin
 * monitoring so both always agree. Business rules: docs/ARCHITECTURE.md §1.4.
 *
 * Day window (BR-5): from max(month start, member join date, program start)
 * to min(month end, program end, today). Today only counts once it has been
 * reported — the day is not over yet, so it is never "missed".
 */
import type { ActivityStatus } from "@prisma/client";

import { addDays, eachDayOfMonth, monthRange, toDateKey, type MonthRef } from "@/lib/date";

export type DayState =
  | "JAMAAH"
  | "SENDIRI"
  /** In the window, in the past, not reported. */
  | "MISSED"
  /** Today, in the window, not reported yet. */
  | "PENDING"
  /** Before the member joined / outside the program window. */
  | "OUTSIDE"
  | "FUTURE";

export type ActivityLike = {
  date: Date;
  status: ActivityStatus;
  notes?: string | null;
  createdAt?: Date;
};

export type DayCell = {
  date: Date;
  key: string;
  state: DayState;
  activity: ActivityLike | null;
};

export type MonthlyStats = {
  month: MonthRef;
  daysInMonth: number;
  /** Days that count towards the percentage (reported + missed). */
  effectiveDays: number;
  jamaah: number;
  sendiri: number;
  missed: number;
  /** Jamaah ÷ effective days, 0–100, rounded (BR-4). */
  percentage: number;
  days: DayCell[];
};

export type WindowBounds = {
  /** Member join date, program start date, … (date-only values). */
  notBefore?: Array<Date | null | undefined>;
  /** Program end date, … (date-only values). */
  notAfter?: Array<Date | null | undefined>;
};

function latest(dates: Date[]): Date {
  return dates.reduce((a, b) => (b.getTime() > a.getTime() ? b : a));
}

function earliest(dates: Date[]): Date {
  return dates.reduce((a, b) => (b.getTime() < a.getTime() ? b : a));
}

const defined = (d: Date | null | undefined): d is Date => d instanceof Date;

export function percentageOf(jamaah: number, effectiveDays: number): number {
  return effectiveDays > 0 ? Math.round((jamaah / effectiveDays) * 100) : 0;
}

export function computeMonthlyStats(input: {
  month: MonthRef;
  today: Date;
  activities: ActivityLike[];
  bounds?: WindowBounds;
}): MonthlyStats {
  const { month, today, activities, bounds = {} } = input;
  const { start, lastDay } = monthRange(month);
  const from = latest([start, ...(bounds.notBefore ?? []).filter(defined)]);
  const to = earliest([lastDay, ...(bounds.notAfter ?? []).filter(defined)]);

  const byDay = new Map(activities.map((a) => [toDateKey(a.date), a]));
  let jamaah = 0;
  let sendiri = 0;
  let missed = 0;

  const days = eachDayOfMonth(month).map((date): DayCell => {
    const key = toDateKey(date);
    const activity = byDay.get(key) ?? null;
    let state: DayState;

    if (activity) {
      // A stored report always counts, even if it falls outside the window
      // (e.g. an admin later moved the program start date).
      state = activity.status;
      if (activity.status === "JAMAAH") jamaah++;
      else sendiri++;
    } else if (date.getTime() > today.getTime()) {
      state = "FUTURE";
    } else if (date.getTime() < from.getTime() || date.getTime() > to.getTime()) {
      state = "OUTSIDE";
    } else if (date.getTime() === today.getTime()) {
      state = "PENDING";
    } else {
      state = "MISSED";
      missed++;
    }

    return { date, key, state, activity };
  });

  const effectiveDays = jamaah + sendiri + missed;
  return {
    month,
    daysInMonth: days.length,
    effectiveDays,
    jamaah,
    sendiri,
    missed,
    percentage: percentageOf(jamaah, effectiveDays),
    days,
  };
}

/**
 * Consecutive JAMAAH days ending today — or yesterday while today is still
 * unreported, so the streak doesn't "break" at dawn before the member reports.
 */
export function computeJamaahStreak(activities: ActivityLike[], today: Date): number {
  const jamaahDays = new Set(
    activities.filter((a) => a.status === "JAMAAH").map((a) => toDateKey(a.date)),
  );
  const reportedToday = activities.some((a) => toDateKey(a.date) === toDateKey(today));

  let cursor = reportedToday ? today : addDays(today, -1);
  let streak = 0;
  while (jamaahDays.has(toDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type WeekBucket = { label: string; jamaah: number; sendiri: number; missed: number };

/** Split the month into 7-day buckets (1–7, 8–14, …) for the weekly chart. */
export function weeklyBuckets(stats: MonthlyStats): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  for (let i = 0; i < stats.days.length; i += 7) {
    const slice = stats.days.slice(i, i + 7);
    const first = slice[0].date.getUTCDate();
    const last = slice[slice.length - 1].date.getUTCDate();
    buckets.push({
      label: first === last ? `${first}` : `${first}–${last}`,
      jamaah: slice.filter((d) => d.state === "JAMAAH").length,
      sendiri: slice.filter((d) => d.state === "SENDIRI").length,
      missed: slice.filter((d) => d.state === "MISSED").length,
    });
  }
  return buckets;
}
