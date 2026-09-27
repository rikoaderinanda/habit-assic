import { CalendarDays } from "lucide-react";

import { ProgressRing } from "@/components/shared/progress-ring";
import { StatTile } from "@/components/shared/stat-tile";
import { cn } from "@/lib/utils";

import type { MonthlyStats } from "../lib/stats";

/** Progress ring + Total / Berjamaah / Sendiri / Belum isi tiles. */
export function MonthSummary({ stats, className }: { stats: MonthlyStats; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center", className)}>
      <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 shadow-xs">
        <ProgressRing value={stats.percentage} label="Persentase berjamaah" sublabel="berjamaah" />
        <p className="text-center text-xs text-muted-foreground">
          {stats.jamaah} dari {stats.effectiveDays} hari
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Total hari"
          value={stats.daysInMonth}
          hint={`${stats.effectiveDays} hari terhitung`}
          icon={CalendarDays}
        />
        <StatTile label="Berjamaah" value={stats.jamaah} tone="jamaah" hint="hari" />
        <StatTile label="Sendiri" value={stats.sendiri} tone="sendiri" hint="hari" />
        <StatTile label="Belum isi" value={stats.missed} tone="missed" hint="hari" />
      </div>
    </div>
  );
}
