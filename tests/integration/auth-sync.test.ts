/**
 * Sign-in side effects (Phase 4): admin bootstrap, profile refresh, audit log.
 * Uses the real database; all rows are namespaced and removed afterwards.
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);
const RUN = `it-${randomUUID().slice(0, 8)}`;
const ADMIN_EMAIL = `${RUN}-admin@test.local`;
const USER_EMAIL = `${RUN}-user@test.local`;

describe.skipIf(!hasDb)("recordSignIn", () => {
  const prisma = new PrismaClient();
  let recordSignIn: typeof import("@/server/auth-sync").recordSignIn;
  let isBootstrapAdmin: typeof import("@/server/auth-sync").isBootstrapAdmin;

  beforeAll(async () => {
    // Configure ADMIN_EMAILS before env.ts parses (and caches) it.
    process.env.ADMIN_EMAILS = `someone@else.test, ${ADMIN_EMAIL.toUpperCase()}`;
    ({ recordSignIn, isBootstrapAdmin } = await import("@/server/auth-sync"));
  });

  afterAll(async () => {
    // Logs first: deleting users would otherwise leave them behind with user_id = NULL.
    await prisma.log.deleteMany({ where: { user: { email: { startsWith: RUN } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  it("matches ADMIN_EMAILS case-insensitively", () => {
    expect(isBootstrapAdmin(" Foo@Bar.test ", ["foo@bar.test"])).toBe(true);
    expect(isBootstrapAdmin("foo@bar.test", [])).toBe(false);
  });

  it("promotes a new user listed in ADMIN_EMAILS and logs ROLE_CHANGE + LOGIN", async () => {
    const user = await prisma.user.create({ data: { email: ADMIN_EMAIL, name: "Old Name" } });
    expect(user.role).toBe("USER");

    await recordSignIn({
      userId: user.id,
      name: "New Name",
      image: "https://lh3.googleusercontent.com/a/x",
      isNewUser: true,
    });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.role).toBe("ADMIN");
    expect(after.name).toBe("New Name");
    expect(after.image).toBe("https://lh3.googleusercontent.com/a/x");

    const logs = await prisma.log.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.action)).toEqual(["ROLE_CHANGE", "LOGIN"]);
    expect(logs[0].metadata).toMatchObject({ from: "USER", to: "ADMIN", reason: "ADMIN_EMAILS" });
    expect(logs[1].metadata).toMatchObject({ provider: "google", isNewUser: true });
  });

  it("does not log ROLE_CHANGE again for an existing admin", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
    await recordSignIn({ userId: user.id, name: "New Name", image: null, isNewUser: false });

    const actions = (await prisma.log.findMany({ where: { userId: user.id } })).map(
      (l) => l.action,
    );
    expect(actions.filter((a) => a === "ROLE_CHANGE")).toHaveLength(1);
    expect(actions.filter((a) => a === "LOGIN")).toHaveLength(2);
  });

  it("keeps a regular user as USER and only logs LOGIN", async () => {
    const user = await prisma.user.create({ data: { email: USER_EMAIL } });
    await recordSignIn({ userId: user.id, name: "Anggota", image: null, isNewUser: true });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.role).toBe("USER");
    expect(after.name).toBe("Anggota");
    const actions = (await prisma.log.findMany({ where: { userId: user.id } })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(["LOGIN"]);
  });

  it("never demotes an admin who is not in ADMIN_EMAILS (roles are managed in the app)", async () => {
    const user = await prisma.user.create({
      data: { email: `${RUN}-appadmin@test.local`, role: "ADMIN" },
    });
    await recordSignIn({ userId: user.id, name: null, image: null, isNewUser: false });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("ADMIN");
  });

  it("ignores an unknown user id without throwing", async () => {
    await expect(
      recordSignIn({ userId: randomUUID(), name: null, image: null, isNewUser: false }),
    ).resolves.toBeUndefined();
  });
});
