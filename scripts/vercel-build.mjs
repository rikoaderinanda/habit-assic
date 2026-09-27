/**
 * Vercel build step (see vercel.json → buildCommand).
 *
 * Production deploys apply pending migrations and the idempotent seed before
 * building, so the schema is always in sync with the code being released.
 * Preview/local builds never touch the database schema.
 */
import { execSync } from "node:child_process";

const run = (command) => {
  console.log(`\n[vercel-build] $ ${command}`);
  execSync(command, { stdio: "inherit" });
};

const target = process.env.VERCEL_ENV ?? "local";

run("npx prisma generate");

if (target === "production") {
  if (!process.env.DIRECT_URL) {
    throw new Error(
      "[vercel-build] DIRECT_URL is required for `prisma migrate deploy` in production.",
    );
  }
  run("npx prisma migrate deploy");
  run("npx prisma db seed");
} else {
  console.log(`[vercel-build] VERCEL_ENV=${target} → skipping migrations and seed.`);
}

run("npx next build");
