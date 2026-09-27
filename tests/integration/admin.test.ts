/**
 * Phase 6: admin services against the real database. All rows are namespaced
 * with RUN and removed afterwards; existing (real) users are never modified.
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseDateKey } from "@/lib/date";

const hasDb = Boolean(process.env.DATABASE_URL);
const RUN = `it-${randomUUID().slice(0, 8)}`;
const d = (key: string) => parseDateKey(key);

describe.skipIf(!hasDb)("admin services", () => {
  const prisma = new PrismaClient();
  let members: typeof import("@/server/services/member.service");
  let programs: typeof import("@/server/services/program.service");
  let adminId: string;
  let aliId: string;
  let budiId: string;
  let program: Awaited<ReturnType<typeof prisma.program.create>>;

  beforeAll(async () => {
    members = await import("@/server/services/member.service");
    programs = await import("@/server/services/program.service");

    const joined = new Date("2026-08-31T17:00:00Z"); // 1 Sep WIB
    adminId = (
      await prisma.user.create({
        data: {
          email: `${RUN}-admin@test.local`,
          name: `${RUN} Admin`,
          role: "ADMIN",
          createdAt: joined,
        },
      })
    ).id;
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
    program = await prisma.program.create({ data: { slug: `${RUN}-subuh`, name: "IT Subuh" } });

    await prisma.activity.createMany({
      data: [
        { userId: aliId, programId: program.id, date: d("2026-09-01"), status: "JAMAAH" },
        { userId: aliId, programId: program.id, date: d("2026-09-02"), status: "JAMAAH" },
        { userId: aliId, programId: program.id, date: d("2026-09-03"), status: "JAMAAH" },
        { userId: budiId, programId: program.id, date: d("2026-09-01"), status: "SENDIRI" },
        { userId: budiId, programId: program.id, date: d("2026-09-03"), status: "JAMAAH" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.log.deleteMany({ where: { user: { email: { startsWith: RUN } } } });
    await prisma.log.deleteMany({
      where: { metadata: { path: ["slug"], string_starts_with: RUN } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.program.deleteMany({ where: { slug: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  it("builds monitoring rows for the month, filtered by search", async () => {
    const rows = await members.getMonitoringRows({
      program,
      month: { year: 2026, month: 9 },
      today: d("2026-09-04"),
      search: RUN,
    });
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(rows).toHaveLength(3);
    expect(byName[`${RUN} Ali`]).toMatchObject({
      jamaah: 3,
      sendiri: 0,
      missed: 0,
      totalInput: 3,
      percentage: 100,
    });
    expect(byName[`${RUN} Budi`]).toMatchObject({
      jamaah: 1,
      sendiri: 1,
      missed: 1,
      totalInput: 2,
      percentage: 33,
    });
    expect(byName[`${RUN} Admin`]).toMatchObject({ totalInput: 0, missed: 3, percentage: 0 });

    const onlyAli = await members.getMonitoringRows({
      program,
      month: { year: 2026, month: 9 },
      today: d("2026-09-04"),
      search: `${RUN}-ALI`, // case-insensitive, matches email
    });
    expect(onlyAli.map((r) => r.id)).toEqual([aliId]);
  });

  it("summarises today and the last 14 days", async () => {
    const overview = await members.getTodayOverview(
      { ...program, description: null },
      d("2026-09-03"),
    );
    // Real members may exist too, so check our members' contribution.
    expect(overview.jamaah).toBeGreaterThanOrEqual(2);
    expect(overview.pendingMembers.map((m) => m.id)).toContain(adminId);
    expect(overview.pendingMembers.map((m) => m.id)).not.toContain(aliId);
    expect(overview.reported + overview.notReported).toBe(overview.totalMembers);
    expect(overview.trend).toHaveLength(14);
    expect(overview.trend.at(-1)?.key).toBe("2026-09-03");
  });

  it("changes roles with an audit log, and refuses self-changes", async () => {
    await expect(members.setMemberRole(adminId, aliId, "ADMIN")).resolves.toEqual({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: aliId } })).role).toBe("ADMIN");
    const log = await prisma.log.findFirstOrThrow({
      where: { userId: adminId, action: "ROLE_CHANGE" },
    });
    expect(log.metadata).toMatchObject({ targetId: aliId, from: "USER", to: "ADMIN" });

    await expect(members.setMemberRole(adminId, aliId, "ADMIN")).resolves.toEqual({
      ok: false,
      code: "UNCHANGED",
    });
    await expect(members.setMemberRole(adminId, aliId, "USER")).resolves.toEqual({ ok: true });
    await expect(members.setMemberRole(adminId, adminId, "USER")).resolves.toEqual({
      ok: false,
      code: "SELF_CHANGE",
    });
    await expect(members.setMemberRole(adminId, randomUUID(), "ADMIN")).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("deactivates and reactivates a member", async () => {
    await expect(members.setMemberActive(adminId, budiId, false)).resolves.toEqual({ ok: true });
    const activeRows = await members.getMonitoringRows({
      program,
      month: { year: 2026, month: 9 },
      today: d("2026-09-04"),
      search: RUN,
    });
    expect(activeRows.map((r) => r.id)).not.toContain(budiId);
    const inactiveRows = await members.getMonitoringRows({
      program,
      month: { year: 2026, month: 9 },
      today: d("2026-09-04"),
      search: RUN,
      active: false,
    });
    expect(inactiveRows.map((r) => r.id)).toEqual([budiId]);
    // History is kept.
    expect(await prisma.activity.count({ where: { userId: budiId } })).toBe(2);

    await expect(members.setMemberActive(adminId, budiId, false)).resolves.toEqual({
      ok: false,
      code: "UNCHANGED",
    });
    await expect(members.setMemberActive(adminId, adminId, false)).resolves.toEqual({
      ok: false,
      code: "SELF_CHANGE",
    });
    await expect(members.setMemberActive(adminId, budiId, true)).resolves.toEqual({ ok: true });
    expect(
      await prisma.log.count({ where: { userId: adminId, action: "USER_STATUS_CHANGE" } }),
    ).toBe(2);
  });

  it("creates, updates and toggles programs; rejects duplicate slugs", async () => {
    const slug = `${RUN}-tahajud`;
    await expect(
      programs.createProgram(adminId, {
        name: "Tahajud",
        slug,
        description: "",
        startDate: "2026-10-01",
        endDate: "",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      programs.createProgram(adminId, {
        name: "Dup",
        slug,
        description: "",
        startDate: "",
        endDate: "",
      }),
    ).resolves.toEqual({ ok: false, code: "SLUG_TAKEN" });

    const created = await prisma.program.findUniqueOrThrow({ where: { slug } });
    expect(created.startDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(created.active).toBe(true);

    await expect(
      programs.updateProgram(adminId, {
        id: created.id,
        name: "Tahajud Berjamaah",
        description: "Qiyamul lail",
        startDate: "",
        endDate: "2026-12-31",
      }),
    ).resolves.toEqual({ ok: true });
    const updated = await prisma.program.findUniqueOrThrow({ where: { id: created.id } });
    expect(updated).toMatchObject({
      name: "Tahajud Berjamaah",
      description: "Qiyamul lail",
      startDate: null,
      slug,
    });

    await expect(programs.setProgramActive(adminId, created.id, false)).resolves.toEqual({
      ok: true,
    });
    expect((await prisma.program.findUniqueOrThrow({ where: { id: created.id } })).active).toBe(
      false,
    );
    await expect(programs.setProgramActive(adminId, randomUUID(), true)).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });

    const actions = (await prisma.log.findMany({ where: { userId: adminId } })).map(
      (l) => l.action,
    );
    expect(actions).toContain("PROGRAM_CREATE");
    expect(actions.filter((a) => a === "PROGRAM_UPDATE")).toHaveLength(2);
  });
});

describe("program schemas", () => {
  it("validates slug format and date window", async () => {
    const { createProgramSchema, slugify } = await import("@/features/programs/schemas");
    expect(slugify("Hafalan Qur'an Juz 30")).toBe("hafalan-qur-an-juz-30");
    expect(slugify("  Kajian Ba'da Maghrib  ")).toBe("kajian-ba-da-maghrib");

    const base = { name: "Tahajud", slug: "tahajud", description: "", startDate: "", endDate: "" };
    expect(createProgramSchema.safeParse(base).success).toBe(true);
    expect(createProgramSchema.safeParse({ ...base, slug: "Bad Slug!" }).success).toBe(false);
    expect(createProgramSchema.safeParse({ ...base, slug: "-x-" }).success).toBe(false);
    const badWindow = createProgramSchema.safeParse({
      ...base,
      startDate: "2026-10-10",
      endDate: "2026-10-01",
    });
    expect(badWindow.success).toBe(false);
    expect(badWindow.error?.issues[0].path).toEqual(["endDate"]);
  });
});
