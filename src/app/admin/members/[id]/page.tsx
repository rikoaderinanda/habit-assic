import { ArrowLeft, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { HistoryList } from "@/features/attendance/components/history-list";
import { MonthCalendar } from "@/features/attendance/components/month-calendar";
import { MonthSummary } from "@/features/attendance/components/month-summary";
import { ProgramTabs } from "@/features/attendance/components/program-tabs";
import { firstParam, resolveMonth, type SearchParams } from "@/features/attendance/lib/page-params";
import { MemberControls } from "@/features/users/components/member-controls";
import { resolveAdminView } from "@/features/users/lib/admin-view";
import { formatDate, formatMonth, monthOf, toDateOnlyInTz, toMonthKey } from "@/lib/date";
import { requireAdmin } from "@/server/guards";
import { getMemberMonthlyStats } from "@/server/services/activity.service";
import { getMemberById } from "@/server/services/member.service";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const member = UUID.test(id) ? await getMemberById(id) : null;
  return { title: member ? (member.name ?? member.email) : "Detail anggota" };
}

export default async function MemberDetailPage({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const raw = await searchParams;
  const [member, view] = await Promise.all([getMemberById(id), resolveAdminView(raw)]);
  if (!member) notFound();

  const { program, today } = view;
  const joinMonth = monthOf(toDateOnlyInTz(member.createdAt));
  const month = resolveMonth(firstParam(raw.month), view.maxMonth, joinMonth);
  const monthKey = toMonthKey(month);
  const displayName = member.name ?? member.email;

  const detail = program
    ? await getMemberMonthlyStats({ user: member, program, month, today })
    : null;
  const days =
    detail?.stats.days
      .filter((d) => ["JAMAAH", "SENDIRI", "MISSED", "PENDING"].includes(d.state))
      .reverse() ?? [];

  return (
    <>
      <Link
        href={`/admin/members${program ? `?program=${program.slug}&month=${monthKey}` : ""}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Monitoring anggota
      </Link>

      <section className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={member.name}
              email={member.email}
              image={member.image}
              className="size-16"
            />
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                  {member.role === "ADMIN" ? "Admin" : "Anggota"}
                </Badge>
                {!member.isActive && <Badge variant="destructive">Nonaktif</Badge>}
                <span className="text-xs text-muted-foreground">
                  Bergabung {formatDate(toDateOnlyInTz(member.createdAt))}
                </span>
              </div>
            </div>
          </div>
          <MemberControls
            userId={member.id}
            name={displayName}
            role={member.role}
            isActive={member.isActive}
            isSelf={member.id === admin.id}
          />
        </div>
      </section>

      {!program || !detail ? (
        <EmptyState icon={History} title="Belum ada program" />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">
              {program.name} · {formatMonth(month)}
            </h2>
            <MonthSwitcher
              month={month}
              min={joinMonth}
              max={view.maxMonth}
              basePath={`/admin/members/${member.id}`}
              params={{ program: program.slug }}
            />
          </div>
          <ProgramTabs
            programs={view.programs}
            selectedSlug={program.slug}
            hrefFor={(slug) => `/admin/members/${member.id}?program=${slug}&month=${monthKey}`}
          />

          <MonthSummary stats={detail.stats} className="mb-4" />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <section
              aria-labelledby="kalender"
              className="h-fit rounded-2xl border bg-card p-5 shadow-xs"
            >
              <h3 id="kalender" className="mb-4 text-base font-semibold">
                Kalender
              </h3>
              <MonthCalendar stats={detail.stats} />
            </section>
            <section aria-labelledby="riwayat">
              <h3 id="riwayat" className="mb-3 text-base font-semibold">
                Riwayat
              </h3>
              {days.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Belum ada riwayat"
                  description="Tidak ada hari terhitung pada bulan ini."
                />
              ) : (
                <HistoryList days={days} />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
