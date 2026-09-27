/**
 * Creates tagged fixture users/activities and signed session cookies.
 *
 * Sign-in: Google OAuth cannot be automated safely, so instead of a test-only
 * login backdoor we mint the exact encrypted session cookie Auth.js issues
 * after a successful Google login (same AUTH_SECRET, same salt). The OAuth
 * redirect itself is covered by auth.spec.ts; the real Google round-trip is a
 * manual check (docs/TESTING.md).
 */
import fs from "node:fs";

import type { FullConfig } from "@playwright/test";

import { todayInTz } from "@/lib/date";

import { prisma } from "./support/db";
import {
  AUTH_DIR,
  FILLER_COUNT,
  historyPattern,
  RUN_FILE,
  SESSION_COOKIE,
  STATE,
  type RunInfo,
} from "./support/fixtures";

async function sessionState(baseURL: string, user: { id: string; name: string; email: string }) {
  const { encode } = await import("next-auth/jwt");
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for E2E tests (.env)");
  const value = await encode({
    token: { sub: user.id, name: user.name, email: user.email },
    secret,
    salt: SESSION_COOKIE,
  });
  const { hostname } = new URL(baseURL);
  return {
    cookies: [
      {
        name: SESSION_COOKIE,
        value,
        domain: hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const tag = `e2e${Date.now().toString(36)}`;
  const today = todayInTz();
  // Joined 45 days ago (00:00 WIB) so a previous month always exists for month-navigation tests.
  const joinedAt = new Date(today.getTime() - 45 * 86_400_000 - 7 * 3_600_000);

  const program = await prisma.program.findUnique({ where: { slug: "subuh-berjamaah" } });
  if (!program?.active)
    throw new Error('E2E needs the seeded, active "subuh-berjamaah" program (npm run db:seed).');

  const create = (suffix: string, name: string, role: "USER" | "ADMIN" = "USER") =>
    prisma.user.create({
      data: { email: `${tag}-${suffix}@test.local`, name, role, createdAt: joinedAt },
      select: { id: true, name: true, email: true },
    });

  const member = await create("member", `${tag} Anggota`);
  const admin = await create("admin", `${tag} Pengurus`, "ADMIN");
  const target = await create("target", `${tag} Target`);
  for (let i = 0; i < FILLER_COUNT; i++)
    await create(`filler${i}`, `${tag} Pengisi ${String(i).padStart(2, "0")}`);

  const rows = [member, target].flatMap((u) =>
    historyPattern(today).map((a) => ({
      userId: u.id,
      programId: program.id,
      date: a.date,
      status: a.status,
    })),
  );
  await prisma.activity.createMany({ data: rows });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const asUser = (u: typeof member) => ({ id: u.id, name: u.name!, email: u.email });
  const run: RunInfo = {
    tag,
    baseURL,
    programSlug: program.slug,
    member: asUser(member),
    admin: asUser(admin),
    target: asUser(target),
    taggedMembers: 3 + FILLER_COUNT,
  };
  fs.writeFileSync(RUN_FILE, JSON.stringify(run, null, 2));
  fs.writeFileSync(STATE.member, JSON.stringify(await sessionState(baseURL, run.member)));
  fs.writeFileSync(STATE.admin, JSON.stringify(await sessionState(baseURL, run.admin)));
  fs.writeFileSync(STATE.target, JSON.stringify(await sessionState(baseURL, run.target)));
  await prisma.$disconnect();
}
