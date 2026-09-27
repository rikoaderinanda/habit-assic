import "server-only";

import type { Prisma, Role } from "@prisma/client";

import {
  buildMonitoringRows,
  dailyParticipation,
  type DailyPoint,
  type MemberInfo,
  type MonitoringRow,
} from "@/features/users/lib/monitoring";
import { addDays, monthRange, type MonthRef } from "@/lib/date";
import { prisma } from "@/lib/prisma/client";
import { logAction } from "@/server/audit";

import type { ProgramSummary } from "./program.service";

const memberSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

function memberWhere(search: string, active: boolean): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { isActive: active };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

/**
 * Monthly numbers for every member matching the filters. Computed in the app
 * (one query for members, one for the month's activities) so that it shares
 * the exact rules of the member pages. Comfortable for a few thousand members.
 */
export async function getMonitoringRows(input: {
  program: ProgramSummary;
  month: MonthRef;
  today: Date;
  search?: string;
  active?: boolean;
}): Promise<MonitoringRow[]> {
  const { start, end } = monthRange(input.month);
  const members = await prisma.user.findMany({
    where: memberWhere(input.search ?? "", input.active ?? true),
    select: memberSelect,
  });
  if (members.length === 0) return [];

  const activities = await prisma.activity.findMany({
    where: {
      programId: input.program.id,
      date: { gte: start, lt: end },
      userId: { in: members.map((m) => m.id) },
    },
    select: { userId: true, date: true, status: true },
  });

  return buildMonitoringRows({
    members,
    activities,
    month: input.month,
    today: input.today,
    program: input.program,
  });
}

export type TodayOverview = {
  totalMembers: number;
  reported: number;
  notReported: number;
  jamaah: number;
  sendiri: number;
  pendingMembers: MemberInfo[];
  trend: DailyPoint[];
};

/** Admin dashboard: today's numbers + last 14 days, active members only (BR-11). */
export async function getTodayOverview(
  program: ProgramSummary,
  today: Date,
): Promise<TodayOverview> {
  const TREND_DAYS = 14;
  const [members, activities] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: memberSelect }),
    prisma.activity.findMany({
      where: {
        programId: program.id,
        date: { gte: addDays(today, -(TREND_DAYS - 1)), lte: today },
        user: { isActive: true },
      },
      select: { userId: true, date: true, status: true },
    }),
  ]);

  const todayTime = today.getTime();
  const reportedToday = new Map(
    activities.filter((a) => a.date.getTime() === todayTime).map((a) => [a.userId, a.status]),
  );
  const jamaah = [...reportedToday.values()].filter((s) => s === "JAMAAH").length;
  const pendingMembers = members
    .filter((m) => !reportedToday.has(m.id))
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "id-ID"));

  return {
    totalMembers: members.length,
    reported: reportedToday.size,
    notReported: pendingMembers.length,
    jamaah,
    sendiri: reportedToday.size - jamaah,
    pendingMembers,
    trend: dailyParticipation({ today, days: TREND_DAYS, members, activities, program }),
  };
}

export function getMemberById(id: string): Promise<MemberInfo | null> {
  return prisma.user.findUnique({ where: { id }, select: memberSelect });
}

export type MemberUpdateOutcome =
  { ok: true } | { ok: false; code: "NOT_FOUND" | "SELF_CHANGE" | "LAST_ADMIN" | "UNCHANGED" };

// Audit logs are written after the transaction commits: the pooled client has a
// small connection_limit, so a query outside `tx` inside the transaction could
// wait for a connection that never frees up (a deadlock when the limit is 1).

/** Admins cannot change their own role, and the last active admin cannot be demoted. */
export async function setMemberRole(
  actorId: string,
  targetId: string,
  role: Role,
): Promise<MemberUpdateOutcome> {
  if (actorId === targetId) return { ok: false, code: "SELF_CHANGE" };

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!target) return { ok: false, code: "NOT_FOUND" } as const;
    if (target.role === role) return { ok: false, code: "UNCHANGED" } as const;
    if (target.role === "ADMIN") {
      const admins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
      if (admins <= 1) return { ok: false, code: "LAST_ADMIN" } as const;
    }
    await tx.user.update({ where: { id: targetId }, data: { role } });
    return { ok: true, from: target.role } as const;
  });

  if (!result.ok) return result;
  await logAction("ROLE_CHANGE", actorId, { targetId, from: result.from, to: role });
  return { ok: true };
}

/** Deactivated members cannot sign in and drop out of monitoring; history is kept. */
export async function setMemberActive(
  actorId: string,
  targetId: string,
  isActive: boolean,
): Promise<MemberUpdateOutcome> {
  if (actorId === targetId) return { ok: false, code: "SELF_CHANGE" };

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetId },
      select: { isActive: true, role: true },
    });
    if (!target) return { ok: false, code: "NOT_FOUND" } as const;
    if (target.isActive === isActive) return { ok: false, code: "UNCHANGED" } as const;
    if (!isActive && target.role === "ADMIN") {
      const admins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
      if (admins <= 1) return { ok: false, code: "LAST_ADMIN" } as const;
    }
    await tx.user.update({ where: { id: targetId }, data: { isActive } });
    return { ok: true } as const;
  });

  if (!result.ok) return result;
  await logAction("USER_STATUS_CHANGE", actorId, { targetId, isActive });
  return { ok: true };
}
