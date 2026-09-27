import { ArrowRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/server/guards";
import { listActivePrograms } from "@/server/services/program.service";

export const metadata: Metadata = { title: "Lapor" };

/** "Lapor" tab: straight to the form when there is a single program, otherwise a picker. */
export default async function ReportIndexPage() {
  await requireUser();
  const programs = await listActivePrograms();

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
          {programs.map((program) => (
            <li key={program.id}>
              <Link
                href={`/dashboard/report/${program.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{program.name}</span>
                  {program.description && (
                    <span className="block truncate text-sm text-muted-foreground">
                      {program.description}
                    </span>
                  )}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
