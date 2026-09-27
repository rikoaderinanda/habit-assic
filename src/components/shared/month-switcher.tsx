import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { LinkPending } from "@/components/shared/link-pending";

import { Button } from "@/components/ui/button";
import { addMonths, compareMonths, formatMonth, toMonthKey, type MonthRef } from "@/lib/date";

/**
 * Previous / next month links. State lives in the URL (?month=YYYY-MM) so
 * pages stay server-rendered, shareable and survive refresh.
 */
export function MonthSwitcher({
  month,
  min,
  max,
  basePath,
  params = {},
}: {
  month: MonthRef;
  min?: MonthRef;
  max: MonthRef;
  basePath: string;
  /** Other search params to preserve (e.g. program). */
  params?: Record<string, string | undefined>;
}) {
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const hasPrev = !min || compareMonths(prev, min) >= 0;
  const hasNext = compareMonths(next, max) <= 0;

  const href = (target: MonthRef) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    search.set("month", toMonthKey(target));
    return `${basePath}?${search.toString()}`;
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-xs">
      {hasPrev ? (
        <Button asChild variant="ghost" size="icon" className="size-10 sm:size-8">
          <Link
            href={href(prev)}
            aria-label={`Bulan sebelumnya (${formatMonth(prev)})`}
            scroll={false}
          >
            <LinkPending>
              <ChevronLeft aria-hidden />
            </LinkPending>
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-10 sm:size-8"
          disabled
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft aria-hidden />
        </Button>
      )}
      <span className="min-w-32 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {formatMonth(month)}
      </span>
      {hasNext ? (
        <Button asChild variant="ghost" size="icon" className="size-10 sm:size-8">
          <Link
            href={href(next)}
            aria-label={`Bulan berikutnya (${formatMonth(next)})`}
            scroll={false}
          >
            <LinkPending>
              <ChevronRight aria-hidden />
            </LinkPending>
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-10 sm:size-8"
          disabled
          aria-label="Bulan berikutnya"
        >
          <ChevronRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
