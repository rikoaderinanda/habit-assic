/**
 * Database-level guarantees (Phase 3 / Phase 8 "Database ✓ Constraint").
 *
 * Runs against the real database in DATABASE_URL. Every row it creates is
 * namespaced with a unique run id and removed in afterAll, so it is safe to
 * run against the dev project. Skipped automatically when no database is set.
 */
import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addDays, parseDateKey, todayInTz } from "@/lib/date";

const hasDb = Boolean(process.env.DATABASE_URL);
const RUN = `it-${randomUUID().slice(0, 8)}`;

function prismaCode(error: unknown): string | undefined {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
}

async function expectPrismaCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, `expected Prisma error ${code}`).not.toBeNull();
  expect(prismaCode(error)).toBe(code);
}

describe.skipIf(!hasDb)("database constraints", () => {
  const prisma = new PrismaClient();
  let userId: string;
  let programId: string;
  let otherProgramId: string;
  const day = parseDateKey("2026-09-05");

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}@test.local`, name: "IT User" },
    });
    const [p1, p2] = await Promise.all([
      prisma.program.create({ data: { slug: `${RUN}-a`, name: "IT Program A" } }),
      prisma.program.create({ data: { slug: `${RUN}-b`, name: "IT Program B" } }),
    ]);
    userId = user.id;
    programId = p1.id;
    otherProgramId = p2.id;
  });

  afterAll(async () => {
    await prisma.log.deleteMany({ where: { metadata: { path: ["run"], equals: RUN } } });
    await prisma.activity.deleteMany({ where: { program: { slug: { startsWith: RUN } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.program.deleteMany({ where: { slug: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  it("defaults a new user to role USER and active", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.role).toBe("USER");
    expect(user.isActive).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    await expectPrismaCode(prisma.user.create({ data: { email: `${RUN}@test.local` } }), "P2002");
  });

  it("rejects a duplicate program slug", async () => {
    await expectPrismaCode(
      prisma.program.create({ data: { slug: `${RUN}-a`, name: "Dup" } }),
      "P2002",
    );
  });

  it("allows exactly one activity per user, program and day", async () => {
    await prisma.activity.create({ data: { userId, programId, date: day, status: "JAMAAH" } });

    await expectPrismaCode(
      prisma.activity.create({ data: { userId, programId, date: day, status: "SENDIRI" } }),
      "P2002",
    );

    const rows = await prisma.activity.findMany({ where: { userId, programId, date: day } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("JAMAAH");
  });

  it("keeps the unique rule under concurrent submits (double tap)", async () => {
    const concurrentDay = addDays(day, 10);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        prisma.activity.create({
          data: { userId, programId, date: concurrentDay, status: "JAMAAH" },
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect(prismaCode((r as PromiseRejectedResult).reason)).toBe("P2002");
    }
  });

  it("allows the same day on another program, and another day on the same program", async () => {
    await expect(
      prisma.activity.create({
        data: { userId, programId: otherProgramId, date: day, status: "SENDIRI" },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.activity.create({
        data: { userId, programId, date: addDays(day, 1), status: "SENDIRI" },
      }),
    ).resolves.toBeTruthy();
  });

  it("stores date-only values without timezone drift", async () => {
    // 04:30 WIB on 2026-09-28 is 21:30 UTC on 2026-09-27 (a day no other test uses).
    const reportDay = todayInTz(new Date("2026-09-27T21:30:00Z"), "Asia/Jakarta");
    const created = await prisma.activity.create({
      data: { userId, programId, date: reportDay, status: "JAMAAH" },
    });
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.date.toISOString()).toBe("2026-09-28T00:00:00.000Z");

    const [{ d }] = await prisma.$queryRaw<{ d: string }[]>`
      SELECT to_char(date, 'YYYY-MM-DD') AS d FROM activities WHERE id = ${created.id}::uuid`;
    expect(d).toBe("2026-09-28");
  });

  it("rejects an unknown status value", async () => {
    await expect(
      prisma.activity.create({
        // @ts-expect-error — invalid enum value on purpose
        data: { userId, programId, date: addDays(day, 20), status: "BOLOS" },
      }),
    ).rejects.toThrow();
  });

  it("rejects notes longer than 500 characters", async () => {
    await expectPrismaCode(
      prisma.activity.create({
        data: {
          userId,
          programId,
          date: addDays(day, 21),
          status: "JAMAAH",
          notes: "x".repeat(501),
        },
      }),
      "P2000",
    );
  });

  it("rejects an activity for a non-existent user or program (foreign keys)", async () => {
    await expectPrismaCode(
      prisma.activity.create({
        data: { userId: randomUUID(), programId, date: day, status: "JAMAAH" },
      }),
      "P2003",
    );
    await expectPrismaCode(
      prisma.activity.create({
        data: { userId, programId: randomUUID(), date: day, status: "JAMAAH" },
      }),
      "P2003",
    );
  });

  it("refuses to delete a program that has activities (RESTRICT)", async () => {
    await expectPrismaCode(prisma.program.delete({ where: { id: programId } }), "P2003");
    await expect(prisma.program.findUnique({ where: { id: programId } })).resolves.not.toBeNull();
  });

  it("rejects a program whose end date is before its start date (CHECK)", async () => {
    await expect(
      prisma.program.create({
        data: {
          slug: `${RUN}-bad-window`,
          name: "Bad window",
          startDate: parseDateKey("2026-09-10"),
          endDate: parseDateKey("2026-09-01"),
        },
      }),
    ).rejects.toThrow(/programs_date_window_check/);
  });

  it("cascades activities and accounts on user delete, but keeps logs with user_id = NULL", async () => {
    const temp = await prisma.user.create({
      data: {
        email: `${RUN}-temp@test.local`,
        accounts: { create: { type: "oidc", provider: "google", providerAccountId: `${RUN}-sub` } },
        activities: { create: { programId, date: day, status: "JAMAAH" } },
        logs: { create: { action: "LOGIN", metadata: { run: RUN } } },
      },
    });

    await prisma.user.delete({ where: { id: temp.id } });

    expect(await prisma.activity.count({ where: { userId: temp.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: temp.id } })).toBe(0);
    const logs = await prisma.log.findMany({ where: { metadata: { path: ["run"], equals: RUN } } });
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBeNull();
  });

  it("has row level security enabled on every app table", async () => {
    const rows = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`;
    const byName = Object.fromEntries(rows.map((r) => [r.relname, r.relrowsecurity]));
    for (const table of [
      "users",
      "accounts",
      "programs",
      "activities",
      "logs",
      "_prisma_migrations",
    ]) {
      expect(byName[table], `RLS on ${table}`).toBe(true);
    }
  });

  it("hides all rows from the Supabase Data API roles (anon)", async () => {
    const visible = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
      const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM programs`;
      return Number(n);
    });
    expect(await prisma.program.count()).toBeGreaterThan(0);
    expect(visible).toBe(0);
  });
});
