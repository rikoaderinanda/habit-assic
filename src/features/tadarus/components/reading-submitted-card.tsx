import { BookOpenCheck } from "lucide-react";

import { formatTimeInTz } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ActivityRecord } from "@/server/services/activity.service";

import { formatJuzRange, formatReading, readingLength, toReading } from "../lib/quran";

/** "Anda sudah mengisi bacaan hari ini" state for Tadarus. */
export function ReadingSubmittedCard({
  activity,
  className,
}: {
  activity: ActivityRecord;
  className?: string;
}) {
  const reading = toReading(activity);
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <BookOpenCheck className="size-7" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">Bacaan tadarus hari ini tersimpan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dikirim pukul {formatTimeInTz(activity.createdAt)} WIB
      </p>
      {reading && (
        <div className="mt-5 w-full max-w-xs rounded-2xl border bg-background px-4 py-4">
          <p className="text-base font-semibold text-balance">{formatReading(reading)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {readingLength(reading).toLocaleString("id-ID")} ayat
            </span>{" "}
            · {formatJuzRange(reading)}
          </p>
        </div>
      )}
      {activity.notes && (
        <p className="mt-4 max-w-sm rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground italic">
          &ldquo;{activity.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
