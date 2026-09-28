/**
 * Phase 5: submitting today's report and reading statistics back, end-to-end
 * against the database (everything except the HTTP/session layer).
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { submitActivitySchema } from "@/features/attendance/schemas";
import { parseDateKey } from "@/lib/date";
import type { ProgramSummary } from "@/server/services/program.service";

const hasDb = Boolean(process.env.DATABASE_URL);
const RUN = `it-${randomUUID().slice(0, 8)}`;

// 2026-09-10 04:35 WIB = 2026-09-09 21:35 UTC
const SUBUH_SEP_10 = new Date("2026-09-09T21:35:00Z");

describe.skipIf(!hasDb)("submitActivityForToday + monthly stats", () => {
  const prisma = new PrismaClient();
  let service: typeof import("@/server/services/activity.service");
  let userId: string;
  let program: ProgramSummary;
  let inactiveProgramId: string;
  let futureProgramId: string;

  beforeAll(async () => {
    service = await import("@/server/services/activity.service");
    const user = await prisma.user.create({
      data: { email: `${RUN}@test.local`, createdAt: new Date("2026-09-01T00:00:00Z") },
    });
    userId = user.id;
    program = await prisma.program.create({
      data: { slug: `${RUN}-subuh`, name: "IT Subuh" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        active: true,
        kind: true,
        scheduleDays: true,
        startDate: true,
        endDate: true,
      },
    });
    inactiveProgramId = (
      await prisma.program.create({ data: { slug: `${RUN}-off`, name: "Off", active: false } })
    ).id;
    futureProgramId = (
      await prisma.program.create({
        data: { slug: `${RUN}-future`, name: "Future", startDate: parseDateKey("2026-10-01") },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.log.deleteMany({ where: { user: { email: { startsWith: RUN } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.program.deleteMany({ where: { slug: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  it("stores the report on the WIB calendar day and writes an audit log", async () => {
    const outcome = await service.submitActivityForToday({
      userId,
      programId: program.id,
      status: "JAMAAH",
      notes: "Masjid Al-Ikhlas",
      now: SUBUH_SEP_10,
    });
    expect(outcome).toEqual({ ok: true, status: "JAMAAH", date: "2026-09-10" });

    const row = await prisma.activity.findFirstOrThrow({
      where: { userId, programId: program.id },
    });
    expect(row.date.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(row.notes).toBe("Masjid Al-Ikhlas");

    const log = await prisma.log.findFirstOrThrow({ where: { userId, action: "SUBMIT_ACTIVITY" } });
    expect(log.metadata).toMatchObject({
      date: "2026-09-10",
      status: "JAMAAH",
      program: program.slug,
    });
  });

  it("answers ALREADY_SUBMITTED on a second report the same day, keeping the first", async () => {
    const again = await service.submitActivityForToday({
      userId,
      programId: program.id,
      status: "SENDIRI",
      notes: null,
      now: new Date("2026-09-10T10:00:00Z"), // 17:00 WIB, same day
    });
    expect(again).toEqual({ ok: false, code: "ALREADY_SUBMITTED" });
    const rows = await prisma.activity.findMany({ where: { userId, programId: program.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("JAMAAH");
    expect(await prisma.log.count({ where: { userId, action: "SUBMIT_ACTIVITY" } })).toBe(1);
  });

  it("resolves concurrent double taps to a single report", async () => {
    const now = new Date("2026-09-10T21:40:00Z"); // 11 Sep 04:40 WIB
    const outcomes = await Promise.all(
      Array.from({ length: 4 }, () =>
        service.submitActivityForToday({
          userId,
          programId: program.id,
          status: "SENDIRI",
          notes: null,
          now,
        }),
      ),
    );
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(outcomes.filter((o) => !o.ok && o.code === "ALREADY_SUBMITTED")).toHaveLength(3);
  });

  it("rejects reports for inactive programs and outside the program window", async () => {
    for (const programId of [inactiveProgramId, futureProgramId, randomUUID()]) {
      await expect(
        service.submitActivityForToday({
          userId,
          programId,
          status: "JAMAAH",
          notes: null,
          now: SUBUH_SEP_10,
        }),
      ).resolves.toEqual({ ok: false, code: "PROGRAM_CLOSED" });
    }
  });

  it("computes monthly stats from stored reports", async () => {
    const { stats } = await service.getMemberMonthlyStats({
      user: { id: userId, createdAt: new Date("2026-09-01T00:00:00Z") },
      program,
      month: { year: 2026, month: 9 },
      today: parseDateKey("2026-09-12"),
    });
    // Days 1–12 count except today (12th, pending): 10 Sep JAMAAH, 11 Sep SENDIRI, 9 missed.
    expect(stats).toMatchObject({
      jamaah: 1,
      sendiri: 1,
      missed: 9,
      effectiveDays: 11,
      percentage: 9,
    });
    expect(stats.days[11].state).toBe("PENDING");
  });

  it("computes the jamaah streak", async () => {
    expect(await service.getJamaahStreak(userId, program.id, parseDateKey("2026-09-11"))).toBe(0);
    expect(await service.getJamaahStreak(userId, program.id, parseDateKey("2026-09-10"))).toBe(1);
  });
});

describe("submitActivitySchema", () => {
  const programId = randomUUID();

  it("accepts a valid payload and trims notes", () => {
    expect(submitActivitySchema.parse({ programId, status: "JAMAAH", notes: "  ok  " })).toEqual({
      programId,
      status: "JAMAAH",
      notes: "ok",
    });
  });

  it("rejects a missing/unknown status with an Indonesian message", () => {
    const result = submitActivitySchema.safeParse({ programId, status: "BOLOS" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Pilih salah satu: Berjamaah atau Sendiri");
    expect(submitActivitySchema.safeParse({ programId }).success).toBe(false);
  });

  it("rejects over-long notes and a non-uuid program", () => {
    expect(
      submitActivitySchema.safeParse({ programId, status: "JAMAAH", notes: "x".repeat(501) })
        .success,
    ).toBe(false);
    expect(submitActivitySchema.safeParse({ programId: "subuh", status: "JAMAAH" }).success).toBe(
      false,
    );
  });

  it("ignores client-supplied date/userId (not part of the schema)", () => {
    const parsed = submitActivitySchema.parse({
      programId,
      status: "SENDIRI",
      date: "2020-01-01",
      userId: randomUUID(),
    });
    expect(parsed).toEqual({ programId, status: "SENDIRI" });
  });
});
