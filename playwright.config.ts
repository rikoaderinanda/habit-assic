import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (Phase 8).
 *
 * By default Playwright builds the app into `.next-e2e` and serves it on :3100,
 * so it never collides with `npm run dev` on :3000. Point E2E_BASE_URL at an
 * already-running server to skip the build (e.g. E2E_BASE_URL=http://localhost:3000).
 *
 * Requires the same .env as the app (DATABASE_URL, AUTH_SECRET, …): fixtures are
 * created in the database by global-setup and removed by global-teardown.
 */
const PORT = 3100;
const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  // Specs share one database; keep them serial so counts/assertions are stable.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      // Heavier flows run once, on desktop only (see test.skip in specs).
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `npx next build && npx next start -p ${PORT}`,
        url: `${baseURL}/login`,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
        env: { NEXT_DIST_DIR: ".next-e2e", AUTH_URL: baseURL },
        stdout: "ignore",
        stderr: "pipe",
      },
});
