/**
 * `npm install` → `prepare` → points git at the repo's .githooks folder, so the
 * pre-push checks are active for everyone who clones the repo.
 *
 * Deliberately a no-op (never an error) where there is no git checkout or no
 * git binary — e.g. Vercel builds — so it can never break an install.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.env.VERCEL || process.env.CI || !existsSync(".git")) process.exit(0);

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  console.log("[hooks] git hooks enabled (.githooks/pre-push)");
} catch {
  console.log("[hooks] git not available — skipping hook setup");
}
