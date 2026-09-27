import fs from "node:fs";

import { prisma } from "./support/db";
import { AUTH_DIR, readRun } from "./support/fixtures";

/** Removes everything global-setup created (activities/accounts cascade with the users). */
export default async function globalTeardown() {
  let tag: string | undefined;
  try {
    tag = readRun().tag;
  } catch {
    return; // setup never finished
  }
  await prisma.log.deleteMany({ where: { user: { email: { startsWith: tag } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.program.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.$disconnect();
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}
