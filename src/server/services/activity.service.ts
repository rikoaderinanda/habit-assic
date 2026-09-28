import "server-only";

import { Prisma, type ActivityStatus, type ProgramKind } from "@prisma/client";

import {
  computeJamaahStreak,
  computeMonthlyStats,
  type MonthlyStats,
} from "@/features/attendance/lib/stats";
import { isProgramOpenOn } from "@/features/programs/lib/program-window";
import { toReading, type Reading } from "@/features/tadarus/lib/quran";
import {
  addDays,
  monthRange,
  toDateKey,
  toDateOnlyInTz,
  todayInTz,
  type MonthRef,
} from "@/lib/date";
import { prisma } from "@/lib/prisma/client";
import { logAction } from "@/server/audit";

import type { ProgramSummary } from "./program.service";

export type SubmitOutcome =
  | { ok: true; status: ActivityStatus; date: string }
  | { ok: false; code: "PROGRAM_CLOSED" | "ALREADY_SUBMITTED" };

const STATUSES_BY_KIND: Record<ProgramKind, ActivityStatus[]> = {
  SHALAT: ["JAMAAH", "SENDIRI"],
  TADARUS: ["HADIR"],
};

/**
 * Record today's report for a member (BR-1–BR-3). The date is derived from
 * `now` in APP_TIMEZONE — callers never pass a date. Uniqueness is enforced
 * by the database, so concurrent submits resolve to one row + ALREADY_SUBMITTED.
 * The status (and reading) must match the program's kind, and today must be
 * on its weekly schedule.
 */
export async function submitActivityForToday(input: {
  userId: string;
  programId: string;
  status: ActivityStatus;
  notes: string | null;
  /** Required for TADARUS programs, forbidden otherwise. */
  reading?: Reading | null;
  now?: Date;
}): Promise<SubmitOutcome> {
  const date = todayInTz(input.now);

  const program = await prisma.program.findUnique({
    where: { id: input.programId },
    select: {
      slug: true,
      kind: true,
      active: true,
      scheduleDays: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!program || !isProgramOpenOn(program, date)) return { ok: false, code: "PROGRAM_CLOSED" };
  const needsReading = program.kind === "TADARUS";
  if (!STATUSES_BY_KIND[program.kind].includes(input.status) || needsReading !== !!input.reading) {
    return { ok: false, code: "PROGRAM_CLOSED" };
  }

  try {
    await prisma.activity.create({
      data: {
        userId: input.userId,
        programId: input.programId,
        date,
        status: input.status,
        notes: input.notes,
        ...input.reading,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, code: "ALREADY_SUBMITTED" };
    }
    throw error;
  }

  await logAction("SUBMIT_ACTIVITY", input.userId, {
    programId: input.programId,
    program: program.slug,
    date: toDateKey(date),
    status: input.status,
    ...(input.reading && { reading: input.reading }),
  });
  return { ok: true, status: input.status, date: toDateKey(date) };
}

export type ActivityRecord = {
  id: string;
  date: Date;
  status: ActivityStatus;
  notes: string | null;
  createdAt: Date;
  surahFrom: number | null;
  ayahFrom: number | null;
  surahTo: number | null;
  ayahTo: number | null;
};

const activitySelect = {
  id: true,
  date: true,
  status: true,
  notes: true,
  createdAt: true,
  surahFrom: true,
  ayahFrom: true,
  surahTo: true,
  ayahTo: true,
} as const;

export function getActivityOn(
  userId: string,
  programId: string,
  date: Date,
): Promise<ActivityRecord | null> {
  return prisma.activity.findUnique({
    where: { userId_programId_date: { userId, programId, date } },
    select: activitySelect,
  });
}

export function listActivitiesInMonth(
  userId: string,
  programId: string,
  month: MonthRef,
): Promise<ActivityRecord[]> {
  const { start, end } = monthRange(month);
  return prisma.activity.findMany({
    where: { userId, programId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    select: activitySelect,
  });
}

/** Monthly statistics for one member and program (see features/attendance/lib/stats.ts). */
export async function getMemberMonthlyStats(input: {
  user: { id: string; createdAt: Date };
  program: ProgramSummary;
  month: MonthRef;
  today: Date;
}): Promise<{ stats: MonthlyStats; activities: ActivityRecord[] }> {
  const activities = await listActivitiesInMonth(input.user.id, input.program.id, input.month);
  const stats = computeMonthlyStats({
    month: input.month,
    today: input.today,
    activities,
    bounds: {
      notBefore: [toDateOnlyInTz(input.user.createdAt), input.program.startDate],
      notAfter: [input.program.endDate],
      scheduleDays: input.program.scheduleDays,
    },
  });
  return { stats, activities };
}

/** The member's most recent Tadarus reading in a program (where to continue from). */
export async function getLastReading(
  userId: string,
  programId: string,
): Promise<{ date: Date; reading: Reading } | null> {
  const last = await prisma.activity.findFirst({
    where: { userId, programId, surahFrom: { not: null } },
    orderBy: { date: "desc" },
    select: { date: true, surahFrom: true, ayahFrom: true, surahTo: true, ayahTo: true },
  });
  const reading = last && toReading(last);
  return reading ? { date: last.date, reading } : null;
}

/** Every reading a member has reported in a program, oldest first (for lifetime totals). */
export async function listReadings(userId: string, programId: string): Promise<Reading[]> {
  const rows = await prisma.activity.findMany({
    where: { userId, programId, surahFrom: { not: null } },
    orderBy: { date: "asc" },
    select: { surahFrom: true, ayahFrom: true, surahTo: true, ayahTo: true },
  });
  return rows.map(toReading).filter((r): r is Reading => r !== null);
}

/** Current consecutive-JAMAAH streak (looks back up to one year). */
export async function getJamaahStreak(
  userId: string,
  programId: string,
  today: Date,
): Promise<number> {
  const activities = await prisma.activity.findMany({
    where: { userId, programId, date: { gte: addDays(today, -366), lte: today } },
    select: { date: true, status: true },
  });
  return computeJamaahStreak(activities, today);
}
