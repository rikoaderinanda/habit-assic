/**
 * Cross-cutting UI quality gates: WCAG 2.1 AA (axe), no horizontal scrolling,
 * no runtime errors, and public PWA/SEO assets.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { readRun, STATE } from "./support/fixtures";

const MEMBER_PAGES = [
  "/dashboard",
  "/dashboard/report/subuh-berjamaah",
  "/dashboard/stats",
  "/dashboard/history",
];
const ADMIN_PAGES = ["/admin/dashboard", "/admin/members", "/admin/programs"];

async function audit(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const violations = axe.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(violations, `axe violations on ${path}`).toEqual([]);

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `horizontal overflow on ${path}`).toBeLessThanOrEqual(innerWidth);
  expect(errors, `runtime errors on ${path}`).toEqual([]);
}

test.describe("Kualitas — halaman publik", () => {
  test("login lolos audit", async ({ page }) => {
    await audit(page, "/login");
  });

  test("URL tak dikenal tanpa login diarahkan ke /login (struktur URL tidak dibocorkan)", async ({
    page,
  }) => {
    await page.goto("/tidak-ada-halaman-ini");
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });

  test("404 bermerek untuk pengguna yang login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STATE.member });
    const page = await context.newPage();
    const res = await page.goto("/tidak-ada-halaman-ini");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
    await context.close();
  });

  test("ikon, manifest dan robots dapat diakses tanpa login", async ({ request }) => {
    for (const [path, type] of [
      ["/icon.svg", "image/svg+xml"],
      ["/apple-icon", "image/png"],
      ["/pwa-icon/192", "image/png"],
      ["/pwa-icon/512-maskable", "image/png"],
      ["/manifest.webmanifest", "application/manifest+json"],
      ["/robots.txt", "text/plain"],
    ] as const) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toContain(type);
    }
    expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \//);
  });

  test("security headers terpasang", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("Kualitas — halaman anggota", () => {
  test.use({ storageState: STATE.member });
  for (const path of MEMBER_PAGES) {
    test(`${path} lolos audit`, async ({ page }) => {
      await audit(page, path);
    });
  }

  test("link 'Lewati ke konten' adalah fokus pertama", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard");
    await page.goto("/dashboard");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Lewati ke konten" })).toBeFocused();
  });
});

test.describe("Kualitas — halaman admin", () => {
  test.use({ storageState: STATE.admin });
  for (const path of [...ADMIN_PAGES, "detail"]) {
    test(`${path === "detail" ? "/admin/members/:id" : path} lolos audit`, async ({ page }) => {
      await audit(page, path === "detail" ? `/admin/members/${readRun().member.id}` : path);
    });
  }

  test("tablet 768px tanpa scroll horizontal", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sekali saja");
    await page.setViewportSize({ width: 768, height: 1000 });
    for (const path of [...MEMBER_PAGES, ...ADMIN_PAGES]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
