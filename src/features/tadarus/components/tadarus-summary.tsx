import { BookOpen, CalendarDays } from "lucide-react";

import { ProgressRing } from "@/components/shared/progress-ring";
import { StatTile } from "@/components/shared/stat-tile";
import type { MonthlyStats } from "@/features/attendance/lib/stats";
import { cn } from "@/lib/utils";

import type { TadarusProgress } from "../lib/progress";

import { QuranProgress } from "./quran-progress";

const number = (n: number) => n.toLocaleString("id-ID");

/** Tadarus month summary: attendance ring + session tiles + the Qur'an progress bar. */
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

      <QuranProgress progress={progress} size="lg" />
    </div>
  );
}
