import { History, Inbox } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { HistoryList } from "@/features/attendance/components/history-list";
import { ProgramTabs } from "@/features/attendance/components/program-tabs";
import type { SearchParams } from "@/features/attendance/lib/page-params";
import { resolveMemberView } from "@/features/attendance/lib/resolve-view";
import { formatMonth } from "@/lib/date";
import { requireUser } from "@/server/guards";
import { getMemberMonthlyStats } from "@/server/services/activity.service";

export const metadata: Metadata = { title: "Riwayat" };

const LISTED_STATES = new Set(["JAMAAH", "SENDIRI", "MISSED", "PENDING"]);

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const view = await resolveMemberView(user, await searchParams);
  const { program, month, today } = view;

  if (!program) {
    return (
      <>
        <PageHeader title="Riwayat" />
        <EmptyState
          icon={Inbox}
          title="Belum ada program"
          description="Riwayat akan muncul setelah ada program aktif."
        />
      </>
    );
  }

  const { stats } = await getMemberMonthlyStats({ user, program, month, today });
  const days = stats.days.filter((d) => LISTED_STATES.has(d.state)).reverse();

  return (
    <>
      <PageHeader
        title="Riwayat"
        description={`${program.name} · ${formatMonth(month)}`}
        actions={
          <MonthSwitcher
            month={month}
            min={view.minMonth}
            max={view.maxMonth}
            basePath="/dashboard/history"
            params={{ program: program.slug }}
          />
        }
      />
      <ProgramTabs
        programs={view.programs}
        selectedSlug={program.slug}
        hrefFor={(slug) => `/dashboard/history?program=${slug}&month=${view.monthKey}`}
      />

      {days.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada riwayat"
          description="Belum ada hari yang terhitung pada bulan ini."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{stats.jamaah}</span>{" "}
            berjamaah ·{" "}
            <span className="font-medium text-foreground tabular-nums">{stats.sendiri}</span>{" "}
            sendiri ·{" "}
            <span className="font-medium text-foreground tabular-nums">{stats.missed}</span> belum
            isi
          </p>
          <HistoryList days={days} />
        </>
      )}
    </>
  );
}
