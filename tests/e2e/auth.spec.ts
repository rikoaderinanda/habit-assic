import { expect, test } from "@playwright/test";

import { readRun, STATE } from "./support/fixtures";

test.describe("Autentikasi — tanpa login", () => {
  for (const path of [
    "/",
    "/dashboard",
    "/dashboard/stats",
    "/admin/dashboard",
    "/admin/members",
  ]) {
    test(`${path} diarahkan ke /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?callbackUrl=/);
      await expect(page.getByRole("button", { name: "Login dengan Google" })).toBeVisible();
    });
  }

  test("API admin menolak tanpa session (401 JSON)", async ({ request }) => {
    const res = await request.get("/api/admin/export", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  test("halaman login: brand, noindex, pesan error ramah", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Jaga Subuh, jaga istiqamah." })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await page.goto("/login?error=AccountDisabled");
    await expect(page.getByText("Akun dinonaktifkan")).toBeVisible();
    await page.goto("/login?error=OAuthCallbackError");
    await expect(page.getByText("Login gagal")).toBeVisible();
  });

  test("tombol Google memulai OAuth dengan redirect_uri, scope dan PKCE yang benar", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/login?callbackUrl=%2Fdashboard%2Fstats");
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().startsWith("https://accounts.google.com/")),
      page.getByRole("button", { name: "Login dengan Google" }).click(),
    ]);
    const url = new URL(request.url());
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
    expect(url.searchParams.get("client_id")).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(url.searchParams.get("scope")).toBe("openid profile email");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  test("callbackUrl eksternal tidak bisa dipakai untuk open redirect", async ({ page }) => {
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example%2Fphish");
    await expect(page.locator('input[name="callbackUrl"]')).toHaveValue("/phish");
  });
});

test.describe("Autentikasi — dengan session", () => {
  test.use({ storageState: STATE.member });

  test("session valid membuka dashboard dan /login mengarahkan kembali", async ({ page }) => {
    const run = readRun();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: run.member.name })).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("keluar menghapus session", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sekali saja");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Menu akun" }).click();
    await page.getByRole("menuitem", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });
});
