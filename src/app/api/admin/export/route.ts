import type { NextRequest } from "next/server";

import { resolveMonth } from "@/features/attendance/lib/page-params";
import { monitoringQuerySchema, sortRows } from "@/features/users/lib/monitoring";
import { toCsv } from "@/lib/csv";
import { monthOf, todayInTz, toMonthKey } from "@/lib/date";
import { logAction } from "@/server/audit";
import { AuthorizationError, assertAdmin } from "@/server/guards";
import { getMonitoringRows } from "@/server/services/member.service";
import { getProgramBySlug, listActivePrograms } from "@/server/services/program.service";

export const dynamic = "force-dynamic";

/** GET /api/admin/export?program=&month=YYYY-MM&q=&status=&sort=&dir= → monitoring table as CSV. */
export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await assertAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "UNAUTHENTICATED" ? 401 : 403 },
      );
    }
    throw error;
  }

  const params = request.nextUrl.searchParams;
  const slug = params.get("program");
  const program = slug ? await getProgramBySlug(slug) : (await listActivePrograms())[0];
  if (!program) return Response.json({ error: "PROGRAM_NOT_FOUND" }, { status: 404 });

  const today = todayInTz();
  const month = resolveMonth(params.get("month") ?? undefined, monthOf(today));
  const query = monitoringQuerySchema.parse(Object.fromEntries(params));

  const rows = sortRows(
    await getMonitoringRows({
      program,
      month,
      today,
      search: query.q,
      active: query.status === "active",
    }),
    query.sort,
    query.dir,
  );

  const csv =
    program.kind === "TADARUS"
      ? toCsv([
          [
            "Nama",
            "Email",
            "Sesi Hadir",
            "Belum Isi",
            "Sesi Terjadwal",
            "Jumlah Ayat",
            "Persentase Kehadiran (%)",
          ],
          ...rows.map((r) => [
            r.name ?? "",
            r.email,
            r.hadir,
            r.missed,
            r.effectiveDays,
            r.ayat,
            r.percentage,
          ]),
        ])
      : toCsv([
          [
            "Nama",
            "Email",
            "Jumlah Jamaah",
            "Jumlah Sendiri",
            "Belum Isi",
            "Total Input",
            "Hari Terhitung",
            "Persentase (%)",
          ],
          ...rows.map((r) => [
            r.name ?? "",
            r.email,
            r.jamaah,
            r.sendiri,
            r.missed,
            r.totalInput,
            r.effectiveDays,
            r.percentage,
          ]),
        ]);

  const monthKey = toMonthKey(month);
  await logAction("EXPORT_CSV", admin.id, {
    program: program.slug,
    month: monthKey,
    rows: rows.length,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${program.slug}-${monthKey}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
