import { BookOpen, CalendarClock, CheckCircle2, Clock, Users } from "lucide-react";

import { StatTile } from "@/components/shared/stat-tile";
import { scheduleLabel } from "@/features/programs/lib/program-window";
import { MemberMiniList } from "@/features/users/components/member-mini-list";
import { formatDate, formatDateWithWeekday, formatTimeInTz, formatWeekdayShort } from "@/lib/date";
import type { TadarusSessionOverview } from "@/server/services/member.service";
import type { ProgramSummary } from "@/server/services/program.service";

import { formatReading, readingLength } from "../lib/quran";

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const number = (n: number) => n.toLocaleString("id-ID");

/** Admin dashboard body for a Tadarus program: latest session + recent sessions. */
export function AdminTadarusOverview({
  program,
  today,
  overview,
}: {
  program: ProgramSummary;
  today: Date;
  overview: TadarusSessionOverview;
}) {
  const { session, nextSession } = overview;
  const isToday = session?.getTime() === today.getTime();
  const notReported = overview.pendingMembers.length;

  return (
    <>
      <section className="mb-6 flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-secondary to-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-secondary-foreground">
              {isToday ? "Sesi hari ini" : "Sesi terakhir"} · {scheduleLabel(program.scheduleDays)}
            </p>
            <h2 className="text-base font-semibold">
              {session ? formatDateWithWeekday(session) : "Belum ada sesi"}
            </h2>
          </div>
        </div>
        {nextSession && (
          <p className="flex items-center gap-2 rounded-xl bg-background/70 px-3 py-2 text-sm">
            <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Berikutnya</span>
            <span className="font-medium">{formatDateWithWeekday(nextSession)}</span>
          </p>
        )}
      </section>

      {session && (
        <>
          <section aria-label="Statistik sesi" className="mb-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Anggota"
                value={overview.totalMembers}
                icon={Users}
                hint="anggota aktif"
              />
              <StatTile
                label="Sudah isi"
                value={overview.reported.length}
                icon={CheckCircle2}
                hint={`${pct(overview.reported.length, overview.totalMembers)}% anggota`}
              />
              <StatTile
                label="Belum isi"
                value={notReported}
                tone="missed"
                hint={`${pct(notReported, overview.totalMembers)}% anggota`}
              />
              <StatTile
                label="Ayat dibaca"
                value={number(overview.totalAyahs)}
                icon={BookOpen}
                hint="total sesi ini"
              />
            </div>
          </section>

          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
            <section
              aria-labelledby="bacaan-anggota"
              className="rounded-2xl border bg-card p-5 shadow-xs"
            >
              <h2 id="bacaan-anggota" className="mb-3 text-base font-semibold">
                Bacaan anggota
              </h2>
              <MemberMiniList
                items={overview.reported.map((r) => ({
                  ...r,
                  trailing: (
                    <span className="max-w-[45%] shrink-0 text-right">
                      <span className="block truncate text-sm font-medium">
                        {r.reading ? formatReading(r.reading) : "—"}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {r.reading ? `${readingLength(r.reading)} ayat · ` : ""}
                        {formatTimeInTz(r.reportedAt)}
                      </span>
                    </span>
                  ),
                }))}
                empty={isToday ? "Belum ada anggota yang mengisi hari ini." : "Tidak ada laporan."}
              />
            </section>

            <section
              aria-labelledby="belum-isi"
              className="rounded-2xl border bg-card p-5 shadow-xs"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="belum-isi" className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  Belum isi
                </h2>
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {notReported}
                </span>
              </div>
              <MemberMiniList
                items={overview.pendingMembers.slice(0, 8)}
                empty="Alhamdulillah, semua anggota sudah mengisi."
              />
              {notReported > 8 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  +{notReported - 8} anggota lainnya
                </p>
              )}
            </section>
          </div>
        </>
      )}

      {overview.recent.length > 1 && (
        <section
          aria-labelledby="sesi-terakhir"
          className="mb-6 rounded-2xl border bg-card p-5 shadow-xs"
        >
          <h2 id="sesi-terakhir" className="text-base font-semibold">
            {overview.recent.length} sesi terakhir
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Kehadiran dan jumlah ayat per sesi</p>
          <ul className="space-y-3">
            {[...overview.recent].reverse().map((point) => {
              const share = pct(point.hadir, point.members);
              return (
                <li
                  key={point.date.toISOString()}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatWeekdayShort(point.date)},{" "}
                    {formatDate(point.date).replace(/ \d{4}$/, "")}
                  </span>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${point.hadir} dari ${point.members} anggota hadir`}
                  >
                    <div
                      className="h-full rounded-full bg-chart-1"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="w-32 text-right text-xs text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">
                      {point.hadir}/{point.members}
                    </span>{" "}
                    · {number(point.ayat)} ayat
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
