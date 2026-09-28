import { BookOpen, BookOpenCheck, CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";

import { IslamicPattern } from "@/components/shared/islamic-pattern";
import { Button } from "@/components/ui/button";
import { scheduleLabel } from "@/features/programs/lib/program-window";
import { diffInDays, formatDateWithWeekday } from "@/lib/date";
import type { ActivityRecord } from "@/server/services/activity.service";
import type { ProgramSummary } from "@/server/services/program.service";

import type { TadarusProgress } from "../lib/progress";
import { formatAyah, formatReading, readingLength, toReading } from "../lib/quran";

function relativeDay(day: Date, today: Date): string {
  const days = diffInDays(day, today);
  return days === 1 ? "besok" : `${days} hari lagi`;
}

/** Beranda card for a Tadarus program: today's state, the next session and khatam progress. */
export function TadarusHomeCard({
  program,
  today,
  isOpenToday,
  nextSession,
  todayActivity,
  progress,
}: {
  program: ProgramSummary;
  today: Date;
  isOpenToday: boolean;
  nextSession: Date | null;
  todayActivity: ActivityRecord | null;
  progress: TadarusProgress;
}) {
  const reading = todayActivity && toReading(todayActivity);
  const titleId = `tadarus-${program.slug}`;

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="relative bg-gradient-to-br from-secondary via-accent to-card px-5 pt-5 pb-4">
        <IslamicPattern className="absolute inset-0 text-primary/[0.06]" />
        <div className="relative flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {program.name}
            </h2>
            <p className="flex items-center gap-1.5 text-xs font-medium text-secondary-foreground">
              <CalendarClock className="size-3.5" aria-hidden />
              {scheduleLabel(program.scheduleDays)}
            </p>
          </div>
        </div>
        {program.description && (
          <p className="relative mt-3 text-sm text-pretty text-muted-foreground">
            {program.description}
          </p>
        )}
      </div>

      <div className="space-y-4 p-5">
        {todayActivity ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
            <BookOpenCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-medium">Bacaan hari ini sudah tersimpan</p>
              {reading && (
                <p className="truncate text-xs text-muted-foreground">
                  {formatReading(reading)} · {readingLength(reading)} ayat
                </p>
              )}
            </div>
          </div>
        ) : isOpenToday ? (
          <div className="space-y-2">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-xl text-base shadow-sm shadow-primary/30"
            >
              <Link href={`/dashboard/report/${program.slug}`}>
                <BookOpen aria-hidden />
                Isi Bacaan Tadarus
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Hari ini jadwal tadarus · lanjut dari{" "}
              <span className="font-medium text-foreground">{formatAyah(progress.next)}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
            <CalendarClock className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            {nextSession ? (
              <p>
                <span className="text-muted-foreground">Sesi berikutnya </span>
                <span className="font-medium">{formatDateWithWeekday(nextSession)}</span>
                <span className="text-muted-foreground"> · {relativeDay(nextSession, today)}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">Belum ada sesi terjadwal berikutnya.</p>
            )}
          </div>
        )}

        <Link
          href={`/dashboard/stats?program=${program.slug}`}
          className="group block rounded-xl border px-4 py-3 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">Menuju khatam</span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
              {progress.percent.toLocaleString("id-ID")}%
              <ChevronRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-chart-1 to-chart-5"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            {progress.position
              ? `Terakhir sampai ${formatAyah(progress.position)} · ${progress.totalAyahs.toLocaleString("id-ID")} ayat dibaca`
              : "Belum ada bacaan tercatat"}
          </p>
        </Link>
      </div>
    </section>
  );
}
