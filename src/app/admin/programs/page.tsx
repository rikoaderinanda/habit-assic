import { CalendarRange, FolderKanban } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { ProgramActiveSwitch } from "@/features/programs/components/program-active-switch";
import { ProgramFormDialog } from "@/features/programs/components/program-form-dialog";
import { formatDate, toDateKey } from "@/lib/date";
import { requireAdmin } from "@/server/guards";
import { listAllPrograms } from "@/server/services/program.service";

export const metadata: Metadata = { title: "Kelola Program" };

function windowLabel(start: Date | null, end: Date | null): string {
  if (!start && !end) return "Tanpa batas waktu";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return start ? `Mulai ${formatDate(start)}` : `Sampai ${formatDate(end!)}`;
}

export default async function ProgramsPage() {
  await requireAdmin();
  const programs = await listAllPrograms();

  return (
    <>
      <PageHeader
        title="Kelola Program"
        description="Program yang aktif muncul di beranda anggota dan bisa dilaporkan setiap hari."
        actions={<ProgramFormDialog />}
      />

      {programs.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Belum ada program"
          description="Buat program pertama, misalnya Subuh Berjamaah."
        />
      ) : (
        <ul className="grid gap-3">
          {programs.map((program) => (
            <li key={program.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{program.name}</h2>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {program.slug}
                    </Badge>
                  </div>
                  {program.description && (
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                  )}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="size-3.5" aria-hidden />
                      {windowLabel(program.startDate, program.endDate)}
                    </span>
                    <span className="tabular-nums">{program.activityCount} laporan</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <ProgramActiveSwitch
                    id={program.id}
                    name={program.name}
                    active={program.active}
                  />
                  <ProgramFormDialog
                    initial={{
                      id: program.id,
                      slug: program.slug,
                      name: program.name,
                      description: program.description,
                      startDate: program.startDate ? toDateKey(program.startDate) : "",
                      endDate: program.endDate ? toDateKey(program.endDate) : "",
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Program yang sudah memiliki laporan tidak dapat dihapus agar riwayat anggota tetap utuh —
        nonaktifkan saja.
      </p>
    </>
  );
}
