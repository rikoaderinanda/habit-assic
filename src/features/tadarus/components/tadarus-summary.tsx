import { BookOpen, CalendarDays, Trophy } from "lucide-react";

import { ProgressRing } from "@/components/shared/progress-ring";
import { StatTile } from "@/components/shared/stat-tile";
import type { MonthlyStats } from "@/features/attendance/lib/stats";
import { cn } from "@/lib/utils";

import { formatAyah, juzOf } from "../lib/quran";
import type { TadarusProgress } from "../lib/progress";

const number = (n: number) => n.toLocaleString("id-ID");

/** Tadarus month summary: attendance ring + session tiles + khatam progress. */
export function TadarusSummary({
  stats,
  monthAyahs,
  progress,
  className,
}: {
  stats: MonthlyStats;
  monthAyahs: number;
  progress: TadarusProgress;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 shadow-xs">
          <ProgressRing value={stats.percentage} label="Kehadiran tadarus" sublabel="kehadiran" />
          <p className="text-center text-xs text-muted-foreground">
            {stats.hadir} dari {stats.effectiveDays} sesi
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Sesi terjadwal"
            value={stats.effectiveDays}
            hint="sampai hari ini"
            icon={CalendarDays}
          />
          <StatTile label="Hadir" value={stats.hadir} tone="jamaah" hint="sesi" />
          <StatTile label="Belum isi" value={stats.missed} tone="missed" hint="sesi" />
          <StatTile
            label="Ayat dibaca"
            value={number(monthAyahs)}
            icon={BookOpen}
            hint="bulan ini"
          />
        </div>
      </div>

      <section aria-labelledby="menuju-khatam" className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="menuju-khatam" className="text-base font-semibold">
              Menuju khatam
            </h2>
            <p className="text-sm text-muted-foreground">
              {progress.position
                ? `Posisi terakhir: ${formatAyah(progress.position)} · Juz ${juzOf(progress.position)}`
                : "Belum ada bacaan. Mulai dari Al-Fatihah, bismillah."}
            </p>
          </div>
          {progress.khatam > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-2/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
              <Trophy className="size-3.5" aria-hidden />
              {progress.khatam}× khatam
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Progres menuju khatam"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          className="mt-4 h-3 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-chart-1 to-chart-5 transition-[width] duration-700 motion-reduce:transition-none"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{progress.percent.toLocaleString("id-ID")}% dari 30 juz</span>
          <span>{number(progress.totalAyahs)} ayat total</span>
        </div>
      </section>
    </div>
  );
}
