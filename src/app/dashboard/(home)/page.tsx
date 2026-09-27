import {
  ArrowRight,
  CalendarCheck2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Inbox,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { IslamicPattern } from "@/components/shared/islamic-pattern";
import { ProgressRing } from "@/components/shared/progress-ring";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/attendance/components/status-badge";
import { isProgramOpenOn } from "@/features/programs/lib/program-window";
import { formatDateWithWeekday, formatMonth, formatTimeInTz, monthOf, todayInTz } from "@/lib/date";
import { requireUser } from "@/server/guards";
import {
  getActivityOn,
  getJamaahStreak,
  getMemberMonthlyStats,
} from "@/server/services/activity.service";
import { listActivePrograms, type ProgramSummary } from "@/server/services/program.service";

export const metadata: Metadata = { title: "Beranda" };

function reportCtaLabel(program: ProgramSummary): string {
  return program.slug === "subuh-berjamaah"
    ? "Isi Laporan Subuh Hari Ini"
    : `Isi Laporan ${program.name} Hari Ini`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayInTz();
  const month = monthOf(today);
  const programs = await listActivePrograms();
  const [primary, ...others] = programs;
  const firstName = (user.name ?? user.email).split(" ")[0];

  const greeting = (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-chart-5 p-5 text-primary-foreground shadow-md shadow-primary/20 sm:p-6">
      <IslamicPattern className="absolute inset-0 text-white/10" />
      <div className="relative flex items-center gap-4">
        <UserAvatar
          name={user.name}
          email={user.email}
          image={user.image}
          className="size-14 ring-2 ring-white/40"
          fallbackClassName="bg-white/20 text-white"
        />
        <div className="min-w-0">
          <p className="text-sm text-primary-foreground/80">Assalamu&apos;alaikum,</p>
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {user.name ?? firstName}
          </h1>
          <p className="mt-0.5 text-xs text-primary-foreground/75">
            {formatDateWithWeekday(today)}
          </p>
        </div>
      </div>
    </section>
  );

  if (!primary) {
    return (
      <>
        {greeting}
        <EmptyState
          icon={Inbox}
          title="Belum ada program aktif"
          description="Pengurus asrama belum membuka program. Silakan cek kembali nanti."
        />
      </>
    );
  }

  const [todayActivity, { stats }, streak] = await Promise.all([
    getActivityOn(user.id, primary.id, today),
    getMemberMonthlyStats({ user, program: primary, month, today }),
    getJamaahStreak(user.id, primary.id, today),
  ]);
  const isOpen = isProgramOpenOn(primary, today);

  return (
    <>
      {greeting}

      <section
        aria-labelledby="program-aktif"
        className="mb-6 rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Badge variant="secondary" className="gap-1">
              <CalendarCheck2 className="size-3" aria-hidden />
              Program Aktif
            </Badge>
            <h2 id="program-aktif" className="text-lg font-semibold tracking-tight">
              {primary.name}
            </h2>
            {primary.description && (
              <p className="text-sm text-pretty text-muted-foreground">{primary.description}</p>
            )}
          </div>
        </div>

        <div className="mt-5">
          {todayActivity ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">Anda sudah mengisi laporan hari ini</p>
                <p className="text-xs text-muted-foreground">
                  Pukul {formatTimeInTz(todayActivity.createdAt)} WIB
                </p>
              </div>
              <StatusBadge state={todayActivity.status} />
            </div>
          ) : isOpen ? (
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-xl text-base shadow-sm shadow-primary/30"
            >
              <Link href={`/dashboard/report/${primary.slug}`}>
                <ClipboardCheck aria-hidden />
                {reportCtaLabel(primary)}
              </Link>
            </Button>
          ) : (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Program tidak menerima laporan hari ini.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="pencapaian" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="pencapaian" className="text-base font-semibold">
            Pencapaian {formatMonth(month)}
          </h2>
          <Link
            href="/dashboard/stats"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
          >
            Detail <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-5 rounded-2xl border bg-card p-5 shadow-xs">
            <ProgressRing
              value={stats.percentage}
              size={104}
              strokeWidth={10}
              label="Persentase berjamaah"
            />
            <dl className="grid flex-1 gap-2 text-sm">
              {(
                [
                  ["Berjamaah", stats.jamaah, "bg-chart-1"],
                  ["Sendiri", stats.sendiri, "bg-chart-2"],
                  ["Belum isi", stats.missed, "bg-chart-3"],
                ] as const
              ).map(([label, value, swatch]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className={`size-2.5 rounded-full ${swatch}`} aria-hidden />
                    {label}
                  </dt>
                  <dd className="font-semibold tabular-nums">{value} hari</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:flex-col sm:justify-center sm:px-8 sm:text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-chart-2/15 text-warning-foreground">
              <Flame className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{streak}</p>
              <p className="text-xs text-muted-foreground">
                hari berturut-turut berjamaah{streak === 0 && " · mulai lagi Subuh berikutnya"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section aria-labelledby="program-lain">
          <h2 id="program-lain" className="mb-3 text-base font-semibold">
            Program lainnya
          </h2>
          <ul className="grid gap-2">
            {others.map((program) => (
              <li key={program.id}>
                <Link
                  href={`/dashboard/report/${program.slug}`}
                  className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/40"
                >
                  {program.name}
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
