import { Download, FolderKanban, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { PagePagination } from "@/components/shared/page-pagination";
import { Button } from "@/components/ui/button";
import { ProgramTabs } from "@/features/attendance/components/program-tabs";
import type { SearchParams } from "@/features/attendance/lib/page-params";
import { MemberSearch } from "@/features/users/components/member-search";
import { MonitoringTable } from "@/features/users/components/monitoring-table";
import { resolveAdminView } from "@/features/users/lib/admin-view";
import {
  monitoringQuerySchema,
  PAGE_SIZE,
  paginate,
  sortRows,
} from "@/features/users/lib/monitoring";
import { formatMonth } from "@/lib/date";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/guards";
import { getMonitoringRows } from "@/server/services/member.service";

export const metadata: Metadata = { title: "Monitoring Anggota" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const view = await resolveAdminView(raw);
  const query = monitoringQuerySchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );
  const { program } = view;

  if (!program) {
    return (
      <>
        <PageHeader title="Monitoring Anggota" />
        <EmptyState
          icon={FolderKanban}
          title="Belum ada program"
          action={
            <Button asChild>
              <Link href="/admin/programs">Kelola program</Link>
            </Button>
          }
        />
      </>
    );
  }

  const current = {
    program: program.slug,
    month: view.monthKey,
    q: query.q || undefined,
    sort: query.sort,
    dir: query.dir,
    status: query.status === "active" ? undefined : query.status,
    page: query.page > 1 ? String(query.page) : undefined,
  };
  const hrefWith = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...current, ...patch }))
      if (value) params.set(key, value);
    return `/admin/members?${params.toString()}`;
  };

  const rows = sortRows(
    await getMonitoringRows({
      program,
      month: view.month,
      today: view.today,
      search: query.q,
      active: query.status === "active",
    }),
    query.sort,
    query.dir,
  );
  const pageData = paginate(rows, query.page, PAGE_SIZE);

  const exportParams = new URLSearchParams({
    program: program.slug,
    month: view.monthKey,
    sort: query.sort,
    dir: query.dir,
    status: query.status,
  });
  if (query.q) exportParams.set("q", query.q);

  return (
    <>
      <PageHeader
        title="Monitoring Anggota"
        description={`${program.name} · ${formatMonth(view.month)}`}
        actions={
          <MonthSwitcher
            month={view.month}
            min={view.minMonth}
            max={view.maxMonth}
            basePath="/admin/members"
            params={{
              program: program.slug,
              q: current.q,
              sort: query.sort,
              dir: query.dir,
              status: current.status,
            }}
          />
        }
      />
      <ProgramTabs
        programs={view.programs}
        selectedSlug={program.slug}
        hrefFor={(slug) => hrefWith({ program: slug, page: undefined })}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MemberSearch key={query.q} defaultValue={query.q} />
        <div className="flex items-center gap-2">
          <div
            className="flex rounded-xl bg-muted p-1 text-sm"
            role="group"
            aria-label="Status anggota"
          >
            {(
              [
                ["active", "Aktif"],
                ["inactive", "Nonaktif"],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={value}
                href={hrefWith({ status: value === "active" ? undefined : value, page: undefined })}
                aria-current={query.status === value ? "true" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition-colors",
                  query.status === value
                    ? "bg-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <a href={`/api/admin/export?${exportParams.toString()}`} download>
              <Download aria-hidden />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={query.q ? SearchX : Users}
          title={query.q ? "Tidak ada anggota yang cocok" : "Belum ada anggota"}
          description={
            query.q
              ? `Tidak ditemukan anggota dengan kata kunci “${query.q}”.`
              : query.status === "inactive"
                ? "Tidak ada anggota nonaktif."
                : "Anggota akan muncul setelah login pertama kali."
          }
        />
      ) : (
        <>
          <MonitoringTable
            rows={pageData.items}
            kind={program.kind}
            sort={query.sort}
            dir={query.dir}
            hrefWith={hrefWith}
            detailQuery={`?program=${program.slug}&month=${view.monthKey}`}
          />
          <PagePagination
            page={pageData.page}
            pageCount={pageData.pageCount}
            total={pageData.total}
            pageSize={PAGE_SIZE}
            hrefFor={(page) => hrefWith({ page: page > 1 ? String(page) : undefined })}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {program.kind === "TADARUS" ? (
              <>
                Input ditampilkan sebagai <span className="font-medium">hadir/sesi terjadwal</span>.
                Persentase = sesi hadir ÷ sesi terjadwal.
              </>
            ) : (
              <>
                Total Input ditampilkan sebagai{" "}
                <span className="font-medium">input/hari terhitung</span>. Persentase = berjamaah ÷
                hari terhitung.
              </>
            )}
          </p>
        </>
      )}
    </>
  );
}
