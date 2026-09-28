/**
 * Tadarus Qur'an: weekly-scheduled reports carrying the passage read, against
 * the real database. Rows are namespaced with RUN and removed afterwards.
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseDateKey } from "@/lib/date";
import type { ProgramSummary } from "@/server/services/program.service";

const hasDb = Boolean(process.env.DATABASE_URL);
const RUN = `it-${randomUUID().slice(0, 8)}`;
const d = (key: string) => parseDateKey(key);

// 14 & 21 Sep 2026 are Mondays; 20:00 WIB = 13:00 UTC.
const MON_14 = new Date("2026-09-14T13:00:00Z");
const MON_21 = new Date("2026-09-21T13:00:00Z");
const WED_16 = new Date("2026-09-16T13:00:00Z");

const programSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  active: true,
  kind: true,
  scheduleDays: true,
  startDate: true,
  endDate: true,
} as const;

describe.skipIf(!hasDb)("tadarus reports", () => {
  const prisma = new PrismaClient();
  let activities: typeof import("@/server/services/activity.service");
  let members: typeof import("@/server/services/member.service");
  let tadarus: ProgramSummary;
  let subuh: ProgramSummary;
  let aliId: string;
  let budiId: string;

  beforeAll(async () => {
    activities = await import("@/server/services/activity.service");
    members = await import("@/server/services/member.service");
    const joined = new Date("2026-08-31T17:00:00Z"); // 1 Sep WIB
    aliId = (
      await prisma.user.create({
        data: { email: `${RUN}-ali@test.local`, name: `${RUN} Ali`, createdAt: joined },
      })
    ).id;
    budiId = (
      await prisma.user.create({
        data: { email: `${RUN}-budi@test.local`, name: `${RUN} Budi`, createdAt: joined },
      })
    ).id;
    tadarus = await prisma.program.create({
      data: { slug: `${RUN}-tadarus`, name: "IT Tadarus", kind: "TADARUS", scheduleDays: [1] },
      select: programSelect,
    });
    subuh = await prisma.program.create({
      data: { slug: `${RUN}-subuh`, name: "IT Subuh" },
      select: programSelect,
    });
  });

  afterAll(async () => {
    await prisma.log.deleteMany({ where: { user: { email: { startsWith: RUN } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.program.deleteMany({ where: { slug: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  const reading = (surahFrom: number, ayahFrom: number, surahTo: number, ayahTo: number) => ({
    surahFrom,
    ayahFrom,
    surahTo,
    ayahTo,
  });

  it("stores the reading on a scheduled day and logs it", async () => {
    await expect(
      activities.submitActivityForToday({
        userId: aliId,
        programId: tadarus.id,
        status: "HADIR",
        notes: null,
        reading: reading(1, 1, 2, 5),
        now: MON_14,
      }),
    ).resolves.toEqual({ ok: true, status: "HADIR", date: "2026-09-14" });

    const row = await prisma.activity.findFirstOrThrow({
      where: { userId: aliId, programId: tadarus.id },
    });
    expect(row).toMatchObject({
      status: "HADIR",
      surahFrom: 1,
      ayahFrom: 1,
      surahTo: 2,
      ayahTo: 5,
    });
    const log = await prisma.log.findFirstOrThrow({
      where: { userId: aliId, action: "SUBMIT_ACTIVITY" },
    });
    expect(log.metadata).toMatchObject({ date: "2026-09-14", reading: reading(1, 1, 2, 5) });
  });

  it("rejects reports on unscheduled days and mismatched report shapes", async () => {
    const base = { userId: budiId, notes: null, now: MON_14 };
    const closed = { ok: false, code: "PROGRAM_CLOSED" };
    // Wednesday: not on the schedule.
    await expect(
      activities.submitActivityForToday({
        ...base,
        programId: tadarus.id,
        status: "HADIR",
        reading: reading(1, 1, 1, 7),
        now: WED_16,
      }),
    ).resolves.toEqual(closed);
    // Shalat status or a missing reading on a Tadarus program.
    await expect(
      activities.submitActivityForToday({ ...base, programId: tadarus.id, status: "JAMAAH" }),
    ).resolves.toEqual(closed);
    await expect(
      activities.submitActivityForToday({ ...base, programId: tadarus.id, status: "HADIR" }),
    ).resolves.toEqual(closed);
    // A reading (or HADIR) on a Shalat program.
    await expect(
      activities.submitActivityForToday({
        ...base,
        programId: subuh.id,
        status: "JAMAAH",
        reading: reading(1, 1, 1, 7),
      }),
    ).resolves.toEqual(closed);
    await expect(
      activities.submitActivityForToday({ ...base, programId: subuh.id, status: "HADIR" }),
    ).resolves.toEqual(closed);

    expect(await prisma.activity.count({ where: { userId: budiId } })).toBe(0);
  });

  it("enforces complete, forward readings and valid weekdays in the database", async () => {
    await expect(
      prisma.activity.create({
        data: {
          userId: budiId,
          programId: tadarus.id,
          date: d("2026-09-07"),
          status: "HADIR",
          surahFrom: 1,
          ayahFrom: 1,
        },
      }),
    ).rejects.toThrow(/activities_reading_complete_check/);
    await expect(
      prisma.activity.create({
        data: {
          userId: budiId,
          programId: tadarus.id,
          date: d("2026-09-07"),
          status: "HADIR",
          ...reading(2, 10, 2, 9),
        },
      }),
    ).rejects.toThrow(/activities_reading_range_check/);
    await expect(
      prisma.program.create({ data: { slug: `${RUN}-bad`, name: "Bad", scheduleDays: [8] } }),
    ).rejects.toThrow(/programs_schedule_days_check/);
  });

  it("continues from the last reading and totals ayahs", async () => {
    await activities.submitActivityForToday({
      userId: aliId,
      programId: tadarus.id,
      status: "HADIR",
      notes: "Musala asrama",
      reading: reading(2, 6, 2, 25),
      now: MON_21,
    });

    const last = await activities.getLastReading(aliId, tadarus.id);
    expect(last?.date.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(last?.reading).toEqual(reading(2, 6, 2, 25));
    expect(await activities.listReadings(aliId, tadarus.id)).toEqual([
      reading(1, 1, 2, 5),
      reading(2, 6, 2, 25),
    ]);
    expect(await activities.getLastReading(budiId, tadarus.id)).toBeNull();
  });

  it("counts only scheduled sessions in monthly stats and monitoring", async () => {
    const { stats } = await activities.getMemberMonthlyStats({
      user: { id: budiId, createdAt: new Date("2026-08-31T17:00:00Z") },
      program: tadarus,
      month: { year: 2026, month: 9 },
      today: d("2026-09-23"),
    });
    // Mondays 7, 14, 21 have passed; 28 is in the future.
    expect(stats).toMatchObject({ effectiveDays: 3, missed: 3, hadir: 0, percentage: 0 });
    expect(stats.days[15].state).toBe("OFF"); // Wed 16 Sep

    const rows = await members.getMonitoringRows({
      program: tadarus,
      month: { year: 2026, month: 9 },
      today: d("2026-09-23"),
      search: RUN,
    });
    const ali = rows.find((r) => r.id === aliId)!;
    // 7 (Al-Fatihah) + 5 + 20 ayahs over two of three sessions.
    expect(ali).toMatchObject({ hadir: 2, missed: 1, effectiveDays: 3, ayat: 32, percentage: 67 });
  });

  it("summarises the latest session for admins", async () => {
    const overview = await members.getTadarusSessionOverview(tadarus, d("2026-09-23"));
    expect(overview.session?.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(overview.nextSession?.toISOString()).toBe("2026-09-28T00:00:00.000Z");

    const ali = overview.reported.find((r) => r.id === aliId);
    expect(ali?.reading).toEqual(reading(2, 6, 2, 25));
    expect(ali?.notes).toBe("Musala asrama");
    expect(overview.pendingMembers.map((m) => m.id)).toContain(budiId);
    expect(overview.pendingMembers.map((m) => m.id)).not.toContain(aliId);

    const sept14 = overview.recent.find((p) => p.date.toISOString().startsWith("2026-09-14"));
    expect(sept14).toMatchObject({ ayat: 12 });
    expect(sept14!.hadir).toBeGreaterThanOrEqual(1);
  });
});
