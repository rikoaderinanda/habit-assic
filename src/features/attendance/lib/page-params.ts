import { compareMonths, parseMonthKey, type MonthRef } from "@/lib/date";

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Month from `?month=YYYY-MM`, clamped to [min, max]. Invalid or missing
 * values fall back to `max` (the current month).
 */
export function resolveMonth(raw: string | undefined, max: MonthRef, min?: MonthRef): MonthRef {
  const parsed = parseMonthKey(raw);
  if (!parsed || compareMonths(parsed, max) > 0) return max;
  if (min && compareMonths(parsed, min) < 0) return min;
  return parsed;
}
