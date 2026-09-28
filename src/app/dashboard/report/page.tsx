import { ArrowRight, BookOpen, Inbox, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { isProgramOpenOn, scheduleLabel } from "@/features/programs/lib/program-window";
import { todayInTz } from "@/lib/date";
import { requireUser } from "@/server/guards";
import { listActivePrograms } from "@/server/services/program.service";

export const metadata: Metadata = { title: "Lapor" };

/** "Lapor" tab: straight to the form when there is a single program, otherwise a picker. */
export default async function ReportIndexPage() {
  await requireUser();
  const programs = await listActivePrograms();
  const today = todayInTz();

  if (programs.length === 1) redirect(`/dashboard/report/${programs[0].slug}`);

  return (
    <>
      <PageHeader title="Lapor" description="Pilih program yang ingin Anda laporkan hari ini." />
      {programs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada program aktif"
          description="Pengurus asrama belum membuka program."
        />
      ) : (
        <ul className="grid gap-3">
          {programs.map((program) => {
            const Icon = program.kind === "TADARUS" ? BookOpen : Users;
            const openToday = isProgramOpenOn(program, today);
            return (
              <li key={program.id}>
                <Link
                  href={`/dashboard/report/${program.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {program.name}
                        {openToday ? (
                          <Badge className="h-5 px-2 text-[11px]">Hari ini</Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 px-2 text-[11px] font-normal">
                            {scheduleLabel(program.scheduleDays)}
                          </Badge>
                        )}
                      </span>
                      {program.description && (
                        <span className="block truncate text-sm text-muted-foreground">
                          {program.description}
                        </span>
                      )}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
