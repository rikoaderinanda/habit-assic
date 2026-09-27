import { BarChart3, CalendarDays, CalendarOff, House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/features/attendance/components/report-form";
import { SubmittedCard } from "@/features/attendance/components/submitted-card";
import { isProgramOpenOn } from "@/features/programs/lib/program-window";
import { formatDateWithWeekday, todayInTz } from "@/lib/date";
import { requireUser } from "@/server/guards";
import { getActivityOn } from "@/server/services/activity.service";
import { getProgramBySlug } from "@/server/services/program.service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getProgramBySlug((await params).slug);
  return { title: program ? `Lapor ${program.name}` : "Lapor" };
}

export default async function ReportPage({ params }: Props) {
  const user = await requireUser();
  const program = await getProgramBySlug((await params).slug);
  if (!program) notFound();

  const today = todayInTz();
  const activity = await getActivityOn(user.id, program.id, today);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={`Laporan ${program.name}`}
        description={
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateWithWeekday(today)}
          </span>
        }
      />

      {activity ? (
        <>
          <SubmittedCard activity={activity} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link href="/dashboard">
                <House aria-hidden />
                Beranda
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link href={`/dashboard/stats?program=${program.slug}`}>
                <BarChart3 aria-hidden />
                Statistik
              </Link>
            </Button>
          </div>
        </>
      ) : !isProgramOpenOn(program, today) ? (
        <EmptyState
          icon={CalendarOff}
          title="Program tidak menerima laporan"
          description={
            program.active
              ? "Hari ini berada di luar periode program."
              : "Program ini sudah dinonaktifkan oleh pengurus."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard">Kembali ke Beranda</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            Tanggal laporan otomatis hari ini dan tidak dapat diubah.
          </div>
          <ReportForm programId={program.id} />
        </div>
      )}
    </div>
  );
}
