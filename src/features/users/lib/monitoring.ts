/**
 * Pure admin-monitoring logic (no I/O). Uses the same computeMonthlyStats as
 * the member pages, so an admin always sees exactly what the member sees.
 */
import type { ActivityStatus, Role } from "@prisma/client";
import { z } from "zod";

import { computeMonthlyStats } from "@/features/attendance/lib/stats";
import { isScheduledOn } from "@/features/programs/lib/program-window";
import { sumAyahs } from "@/features/tadarus/lib/progress";
import { addDays, toDateKey, toDateOnlyInTz, type MonthRef } from "@/lib/date";

export type MemberInfo = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
};

export type MemberActivity = {
  userId: string;
  date: Date;
  status: ActivityStatus;
  surahFrom?: number | null;
  ayahFrom?: number | null;
  surahTo?: number | null;
  ayahTo?: number | null;
};

export type ProgramBounds = {
  startDate: Date | null;
  endDate: Date | null;
  /** ISO weekdays; empty = every day. */
  scheduleDays: number[];
};

export type MonitoringRow = MemberInfo & {
  jamaah: number;
  sendiri: number;
  /** Tadarus sessions attended. */
  hadir: number;
  /** Tadarus: ayahs read in the month. */
  ayat: number;
  missed: number;
  totalInput: number;
  effectiveDays: number;
  percentage: number;
};

export function buildMonitoringRows(input: {
  members: MemberInfo[];
  activities: MemberActivity[];
  month: MonthRef;
  today: Date;
  program: ProgramBounds;
  timeZone?: string;
}): MonitoringRow[] {
  const byUser = new Map<string, MemberActivity[]>();
  for (const activity of input.activities) {
    const list = byUser.get(activity.userId);
    if (list) list.push(activity);
    else byUser.set(activity.userId, [activity]);
  }

  return input.members.map((member) => {
    const stats = computeMonthlyStats({
      month: input.month,
      today: input.today,
      activities: byUser.get(member.id) ?? [],
      bounds: {
        notBefore: [toDateOnlyInTz(member.createdAt, input.timeZone), input.program.startDate],
        notAfter: [input.program.endDate],
        scheduleDays: input.program.scheduleDays,
      },
    });
    return {
      ...member,
      jamaah: stats.jamaah,
      sendiri: stats.sendiri,
      hadir: stats.hadir,
      ayat: sumAyahs(byUser.get(member.id) ?? []),
      missed: stats.missed,
      totalInput: stats.jamaah + stats.sendiri + stats.hadir,
      effectiveDays: stats.effectiveDays,
      percentage: stats.percentage,
    };
  });
}

// ─── Query params (URL is the state: ?q=&sort=&dir=&page=&status=) ────────────

export const SORT_KEYS = ["name", "input", "jamaah", "sendiri", "ayat", "percentage"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export const PAGE_SIZE = 20;

export const monitoringQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  sort: z.enum(SORT_KEYS).catch("name"),
  dir: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  status: z.enum(["active", "inactive"]).catch("active"),
});

export type MonitoringQuery = z.infer<typeof monitoringQuerySchema>;

const collator = new Intl.Collator("id-ID", { sensitivity: "base" });
const displayName = (row: MemberInfo) => row.name?.trim() || row.email;

export function sortRows(rows: MonitoringRow[], key: SortKey, dir: SortDir): MonitoringRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (row: MonitoringRow): number =>
    key === "input"
      ? row.totalInput
      : key === "jamaah"
        ? row.jamaah
        : key === "sendiri"
          ? row.sendiri
          : key === "ayat"
            ? row.ayat
            : row.percentage;

  return [...rows].sort((a, b) => {
    const primary =
      key === "name" ? collator.compare(displayName(a), displayName(b)) : value(a) - value(b);
    // Stable tie-break by name so pages don't shuffle between requests.
    return primary !== 0 ? primary * sign : collator.compare(displayName(a), displayName(b));
  });
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
    total: items.length,
  };
}

// ─── Today overview & daily trend ─────────────────────────────────────────────

export type DailyPoint = {
  key: string;
  date: Date;
  members: number;
  jamaah: number;
  sendiri: number;
  hadir: number;
  missed: number;
};

/**
 * Participation per day for the last `days` days (oldest first). A member
 * counts from their join day; `missed` = members − reports (today included,
 * so it reads as "belum input" for today). Unscheduled days have no members.
 */
export function dailyParticipation(input: {
  today: Date;
  days: number;
  members: Array<{ id: string; createdAt: Date }>;
  activities: MemberActivity[];
  program: ProgramBounds;
  timeZone?: string;
}): DailyPoint[] {
  const joined = input.members.map((m) => ({
    id: m.id,
    from: toDateOnlyInTz(m.createdAt, input.timeZone).getTime(),
  }));
  const memberIds = new Set(joined.map((m) => m.id));
  const empty = { jamaah: 0, sendiri: 0, hadir: 0 };
  const counts = new Map<string, typeof empty>();
  for (const a of input.activities) {
    if (!memberIds.has(a.userId)) continue;
    const key = toDateKey(a.date);
    const c = counts.get(key) ?? { ...empty };
    if (a.status === "JAMAAH") c.jamaah++;
    else if (a.status === "HADIR") c.hadir++;
    else c.sendiri++;
    counts.set(key, c);
  }

  const points: DailyPoint[] = [];
  for (let i = input.days - 1; i >= 0; i--) {
    const date = addDays(input.today, -i);
    const t = date.getTime();
    const inProgram =
      (!input.program.startDate || t >= input.program.startDate.getTime()) &&
      (!input.program.endDate || t <= input.program.endDate.getTime()) &&
      isScheduledOn(input.program, date);
    const members = inProgram ? joined.filter((m) => m.from <= t).length : 0;
    const key = toDateKey(date);
    const { jamaah, sendiri, hadir } = counts.get(key) ?? empty;
    points.push({
      key,
      date,
      members,
      jamaah,
      sendiri,
      hadir,
      missed: Math.max(0, members - jamaah - sendiri - hadir),
    });
  }
  return points;
}
