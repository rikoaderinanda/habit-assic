import { Flame, Inbox } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { MonthCalendar } from "@/features/attendance/components/month-calendar";
import { MonthSummary } from "@/features/attendance/components/month-summary";
import { ProgramTabs } from "@/features/attendance/components/program-tabs";
import { WeeklyChart } from "@/features/attendance/components/weekly-chart";
import type { SearchParams } from "@/features/attendance/lib/page-params";
import { resolveMemberView } from "@/features/attendance/lib/resolve-view";
import { weeklyBuckets } from "@/features/attendance/lib/stats";
import { ReadingChart } from "@/features/tadarus/components/reading-chart";
import { TadarusSummary } from "@/features/tadarus/components/tadarus-summary";
import { computeTadarusProgress, sumAyahs } from "@/features/tadarus/lib/progress";
import { formatReading, readingLength, toReading } from "@/features/tadarus/lib/quran";
import { formatDate, formatMonth } from "@/lib/date";
import { requireUser } from "@/server/guards";
import {
  getJamaahStreak,
  getMemberMonthlyStats,
  listReadings,
} from "@/server/services/activity.service";

export const metadata: Metadata = { title: "Statistik" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const view = await resolveMemberView(user, await searchParams);
  const { program, month, today } = view;

  if (!program) {
    return (
      <>
        <PageHeader title="Statistik" />
        <EmptyState
          icon={Inbox}
          title="Belum ada program"
          description="Statistik akan muncul setelah ada program aktif."
        />
      </>
    );
  }

  const header = (
    <>
      <PageHeader
        title="Statistik"
        description={`${program.name} · ${formatMonth(month)}`}
        actions={
          <MonthSwitcher
            month={month}
            min={view.minMonth}
            max={view.maxMonth}
            basePath="/dashboard/stats"
            params={{ program: program.slug }}
          />
        }
      />
      <ProgramTabs
        programs={view.programs}
        selectedSlug={program.slug}
        hrefFor={(slug) => `/dashboard/stats?program=${slug}&month=${view.monthKey}`}
      />
    </>
  );

  if (program.kind === "TADARUS") {
    const [{ stats, activities }, readings] = await Promise.all([
      getMemberMonthlyStats({ user, program, month, today }),
      listReadings(user.id, program.id),
    ]);
    const sessions = activities.flatMap((a) => {
      const reading = toReading(a);
      return reading
        ? [
            {
              label: `${a.date.getUTCDate()}/${a.date.getUTCMonth() + 1}`,
              tooltip: `${formatDate(a.date)} · ${formatReading(reading)}`,
              ayat: readingLength(reading),
            },
          ]
        : [];
    });

    return (
      <>
        {header}
        <TadarusSummary
          stats={stats}
          monthAyahs={sumAyahs(activities)}
          progress={computeTadarusProgress(readings)}
          className="mb-4"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="kalender" className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 id="kalender" className="mb-4 text-base font-semibold">
              Kalender sesi
            </h2>
            <MonthCalendar stats={stats} kind="TADARUS" />
          </section>
          <section aria-labelledby="per-sesi" className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 id="per-sesi" className="mb-1 text-base font-semibold">
              Ayat per sesi
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Jumlah ayat yang dibaca setiap sesi
            </p>
            {sessions.length > 0 ? (
              <ReadingChart data={sessions} />
            ) : (
              <p className="flex h-56 items-center justify-center rounded-xl bg-muted/50 px-6 text-center text-sm text-muted-foreground">
                Belum ada bacaan pada bulan ini.
              </p>
            )}
          </section>
        </div>
      </>
    );
  }

  const [{ stats }, streak] = await Promise.all([
    getMemberMonthlyStats({ user, program, month, today }),
    getJamaahStreak(user.id, program.id, today),
  ]);
  const hasData = stats.effectiveDays > 0;

  return (
    <>
      {header}

      <MonthSummary stats={stats} className="mb-4" />

      <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-xs">
        <Flame className="size-5 text-warning" aria-hidden />
        <span>
          <span className="font-semibold tabular-nums">{streak} hari</span>{" "}
          <span className="text-muted-foreground">berjamaah berturut-turut (saat ini)</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="kalender" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="kalender" className="mb-4 text-base font-semibold">
            Kalender
          </h2>
          <MonthCalendar stats={stats} />
        </section>

        <section aria-labelledby="per-pekan" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="per-pekan" className="mb-1 text-base font-semibold">
            Per pekan
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Jumlah hari per rentang tanggal</p>
          {hasData ? (
            <WeeklyChart buckets={weeklyBuckets(stats)} />
          ) : (
            <p className="flex h-56 items-center justify-center rounded-xl bg-muted/50 px-6 text-center text-sm text-muted-foreground">
              Belum ada hari yang terhitung pada bulan ini.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
