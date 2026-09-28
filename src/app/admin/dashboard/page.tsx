import { CheckCircle2, ChevronRight, Clock, FolderKanban, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { ProgramTabs } from "@/features/attendance/components/program-tabs";
import type { SearchParams } from "@/features/attendance/lib/page-params";
import { AdminTadarusOverview } from "@/features/tadarus/components/admin-tadarus-overview";
import { DailyTrendChart, type TrendDatum } from "@/features/users/components/daily-trend-chart";
import { MemberMiniList } from "@/features/users/components/member-mini-list";
import { resolveAdminView } from "@/features/users/lib/admin-view";
import { sortRows } from "@/features/users/lib/monitoring";
import { formatDate, formatDateWithWeekday, formatMonth, formatWeekdayShort } from "@/lib/date";
import { requireAdmin } from "@/server/guards";
import {
  getMonitoringRows,
  getTadarusSessionOverview,
  getTodayOverview,
} from "@/server/services/member.service";

export const metadata: Metadata = { title: "Admin Dashboard" };

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const view = await resolveAdminView(await searchParams);
  const { program, today } = view;

  if (!program) {
    return (
      <>
        <PageHeader title="Dashboard Admin" />
        <EmptyState
          icon={FolderKanban}
          title="Belum ada program"
          description="Buat program pertama untuk mulai memantau anggota."
          action={
            <Button asChild>
              <Link href="/admin/programs">Kelola program</Link>
            </Button>
          }
        />
      </>
    );
  }

  const currentMonth = view.maxMonth;
  const isTadarus = program.kind === "TADARUS";
  const [overview, tadarus, monthRows] = await Promise.all([
    isTadarus ? null : getTodayOverview(program, today),
    isTadarus ? getTadarusSessionOverview(program, today) : null,
    getMonitoringRows({ program, month: currentMonth, today }),
  ]);
  const lowest = sortRows(
    monthRows.filter((r) => r.effectiveDays > 0),
    "percentage",
    "asc",
  ).slice(0, 5);
  const average = monthRows.length
    ? Math.round(monthRows.reduce((sum, r) => sum + r.percentage, 0) / monthRows.length)
    : 0;

  const trend: TrendDatum[] = (overview?.trend ?? []).map((p) => ({
    label: `${p.date.getUTCDate()}/${p.date.getUTCMonth() + 1}`,
    tooltip: `${formatWeekdayShort(p.date)}, ${formatDate(p.date)}`,
    jamaah: p.jamaah,
    sendiri: p.sendiri,
    missed: p.missed,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard Admin"
        description={`${program.name} · ${formatDateWithWeekday(today)}`}
      />
      <ProgramTabs
        programs={view.programs}
        selectedSlug={program.slug}
        hrefFor={(slug) => `/admin/dashboard?program=${slug}`}
      />

      {tadarus && <AdminTadarusOverview program={program} today={today} overview={tadarus} />}

      {overview && (
        <>
          <section aria-label="Statistik hari ini" className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Hari ini</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile
                label="Total anggota"
                value={overview.totalMembers}
                icon={Users}
                hint="anggota aktif"
              />
              <StatTile
                label="Sudah input"
                value={overview.reported}
                icon={CheckCircle2}
                hint={`${pct(overview.reported, overview.totalMembers)}% anggota`}
              />
              <StatTile
                label="Belum input"
                value={overview.notReported}
                tone="missed"
                hint={`${pct(overview.notReported, overview.totalMembers)}% anggota`}
              />
              <StatTile
                label="Berjamaah"
                value={overview.jamaah}
                tone="jamaah"
                hint={`${pct(overview.jamaah, overview.totalMembers)}% anggota`}
              />
              <StatTile
                label="Sendiri"
                value={overview.sendiri}
                tone="sendiri"
                hint={`${pct(overview.sendiri, overview.totalMembers)}% anggota`}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </section>

          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
            <section
              aria-labelledby="tren"
              className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs"
            >
              <h2 id="tren" className="text-base font-semibold">
                14 hari terakhir
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Jumlah anggota per status setiap hari
              </p>
              <DailyTrendChart data={trend} />
            </section>

            <section
              aria-labelledby="belum-input"
              className="rounded-2xl border bg-card p-5 shadow-xs"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="belum-input" className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  Belum input hari ini
                </h2>
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {overview.notReported}
                </span>
              </div>
              <MemberMiniList
                items={overview.pendingMembers.slice(0, 8)}
                empty="Alhamdulillah, semua anggota sudah input."
              />
              {overview.notReported > 8 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  +{overview.notReported - 8} anggota lainnya
                </p>
              )}
            </section>
          </div>
        </>
      )}

      <section aria-labelledby="perhatian" className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="perhatian" className="text-base font-semibold">
              Perlu perhatian · {formatMonth(currentMonth)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isTadarus ? "Kehadiran tadarus terendah" : "Persentase berjamaah terendah"} ·
              rata-rata semua anggota{" "}
              <span className="font-semibold text-foreground tabular-nums">{average}%</span>
            </p>
          </div>
          <Link
            href={`/admin/members?program=${program.slug}&sort=percentage&dir=asc`}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
          >
            Semua anggota <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <MemberMiniList
          items={lowest.map((r) => ({
            ...r,
            trailing: (
              <span className="flex items-center gap-2 text-right">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {isTadarus
                    ? `${r.hadir}/${r.effectiveDays} sesi`
                    : `${r.jamaah}/${r.effectiveDays} hari`}
                </span>
                <span className="w-11 text-sm font-semibold tabular-nums">{r.percentage}%</span>
              </span>
            ),
          }))}
          empty="Belum ada data bulan ini."
        />
      </section>
    </>
  );
}
