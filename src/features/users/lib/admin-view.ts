import "server-only";

import { firstParam, resolveMonth, type SearchParams } from "@/features/attendance/lib/page-params";
import { monthOf, todayInTz, toDateOnlyInTz, toMonthKey, type MonthRef } from "@/lib/date";
import { prisma } from "@/lib/prisma/client";
import { listAllPrograms, type ProgramWithUsage } from "@/server/services/program.service";

export type AdminView = {
  today: Date;
  programs: ProgramWithUsage[];
  program: ProgramWithUsage | null;
  month: MonthRef;
  monthKey: string;
  minMonth: MonthRef;
  maxMonth: MonthRef;
};

/** Selected program (default: first active) and month for admin pages. */
export async function resolveAdminView(searchParams: SearchParams): Promise<AdminView> {
  const today = todayInTz();
  const [programs, firstUser] = await Promise.all([
    listAllPrograms(),
    prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const slug = firstParam(searchParams.program);
  const program =
    programs.find((p) => p.slug === slug) ?? programs.find((p) => p.active) ?? programs[0] ?? null;

  const maxMonth = monthOf(today);
  const minMonth = firstUser ? monthOf(toDateOnlyInTz(firstUser.createdAt)) : maxMonth;
  const month = resolveMonth(firstParam(searchParams.month), maxMonth, minMonth);

  return { today, programs, program, month, monthKey: toMonthKey(month), minMonth, maxMonth };
}
