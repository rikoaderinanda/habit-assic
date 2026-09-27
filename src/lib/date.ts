/**
 * Calendar-date helpers.
 *
 * A "date-only" value is represented as a `Date` at 00:00:00.000 UTC of that
 * calendar day — the same shape Prisma returns for `@db.Date` columns. All
 * arithmetic below is done in UTC on those values, so results never depend on
 * the server's local timezone (Vercel runs in UTC, developers may run in WIB).
 *
 * The only place a real timezone matters is deciding *which* calendar day an
 * instant belongs to (`toDateOnlyInTz`): 04:30 WIB on the 5th is 21:30 UTC on
 * the 4th, but for the member it is the 5th.
 */

export const DEFAULT_TIMEZONE = "Asia/Jakarta";
const MS_PER_DAY = 86_400_000;

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

/** "YYYY-MM-DD" of the calendar day `instant` falls on in `timeZone`. */
export function dateKeyInTz(instant: Date, timeZone: string = getAppTimezone()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Parse "YYYY-MM-DD" into a date-only value. Throws on malformed or impossible dates. */
export function parseDateKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new RangeError(`Invalid date key: ${key}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new RangeError(`Invalid date key: ${key}`);
  }
  return date;
}

/** Format a date-only value as "YYYY-MM-DD". */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date-only value for the calendar day `instant` falls on in `timeZone`. */
export function toDateOnlyInTz(instant: Date, timeZone: string = getAppTimezone()): Date {
  return parseDateKey(dateKeyInTz(instant, timeZone));
}

/** Today's date-only value in the app timezone. */
export function todayInTz(now: Date = new Date(), timeZone: string = getAppTimezone()): Date {
  return toDateOnlyInTz(now, timeZone);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (both date-only). */
export function diffInDays(to: Date, from: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type MonthRef = { year: number; month: number }; // month: 1–12

export function monthOf(date: Date): MonthRef {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** "YYYY-MM" */
export function toMonthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Parse "YYYY-MM"; returns null for malformed input so callers can fall back to the current month. */
export function parseMonthKey(key: string | null | undefined): MonthRef | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function daysInMonth({ year, month }: MonthRef): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** First day (inclusive), first day of next month (exclusive, for `gte`/`lt` queries) and last day. */
export function monthRange(ref: MonthRef): { start: Date; end: Date; lastDay: Date } {
  const start = new Date(Date.UTC(ref.year, ref.month - 1, 1));
  const end = new Date(Date.UTC(ref.year, ref.month, 1));
  return { start, end, lastDay: addDays(end, -1) };
}

/** Every date-only value in the month, in order. */
export function eachDayOfMonth(ref: MonthRef): Date[] {
  const { start } = monthRange(ref);
  return Array.from({ length: daysInMonth(ref) }, (_, i) => addDays(start, i));
}

/**
 * Number of days in `ref` a member could have reported on (BR-5):
 * from max(month start, each `notBefore`) through min(month end, today).
 * Returns 0 for future months or when a floor lies after the window.
 */
export function effectiveDays(
  ref: MonthRef,
  today: Date,
  notBefore: Array<Date | null | undefined> = [],
): number {
  const { start, lastDay } = monthRange(ref);
  const from = notBefore
    .filter((d): d is Date => d instanceof Date)
    .reduce((a, b) => (b.getTime() > a.getTime() ? b : a), start);
  const to = today.getTime() < lastDay.getTime() ? today : lastDay;
  const days = diffInDays(to, from) + 1;
  return days > 0 ? days : 0;
}

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "5 September 2026" */
export function formatDate(date: Date): string {
  return longDateFormatter.format(date);
}

/** "Sabtu, 5 September 2026" */
export function formatDateWithWeekday(date: Date): string {
  return weekdayDateFormatter.format(date);
}

/** "September 2026" */
export function formatMonth(ref: MonthRef): string {
  return monthFormatter.format(monthRange(ref).start);
}

/** "Sab" — short weekday of a date-only value. */
export function formatWeekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short" }).format(date);
}

/** "04.35" — wall-clock time of an instant in the app timezone. */
export function formatTimeInTz(instant: Date, timeZone: string = getAppTimezone()): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

/** 0 = Monday … 6 = Sunday (Indonesian calendars start on Monday). */
export function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Negative when a < b, 0 when equal, positive when a > b. */
export function compareMonths(a: MonthRef, b: MonthRef): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}
