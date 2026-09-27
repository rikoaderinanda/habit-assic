import "server-only";

import { monthOf, todayInTz, toDateOnlyInTz, toMonthKey, type MonthRef } from "@/lib/date";
import type { CurrentUser } from "@/server/guards";
import { listProgramsForUser, type ProgramSummary } from "@/server/services/program.service";

import { firstParam, resolveMonth, type SearchParams } from "./page-params";

export type MemberView = {
  today: Date;
  programs: ProgramSummary[];
  program: ProgramSummary | null;
  month: MonthRef;
  monthKey: string;
  minMonth: MonthRef;
  maxMonth: MonthRef;
};

/** Shared by /dashboard/stats and /dashboard/history: selected program + month from the URL. */
export async function resolveMemberView(
  user: CurrentUser,
  searchParams: SearchParams,
): Promise<MemberView> {
  const today = todayInTz();
  const programs = await listProgramsForUser(user.id);
  const slug = firstParam(searchParams.program);
  const program = programs.find((p) => p.slug === slug) ?? programs[0] ?? null;

  const maxMonth = monthOf(today);
  const minMonth = monthOf(toDateOnlyInTz(user.createdAt));
  const month = resolveMonth(firstParam(searchParams.month), maxMonth, minMonth);

  return { today, programs, program, month, monthKey: toMonthKey(month), minMonth, maxMonth };
}
