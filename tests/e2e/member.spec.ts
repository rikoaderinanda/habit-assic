import { expect, test, type Page } from "@playwright/test";

import { toDateKey, todayInTz } from "@/lib/date";

import { expectedMonthlyStats, prisma } from "./support/db";
import { readRun, STATE } from "./support/fixtures";

test.use({ storageState: STATE.member });

async function tileValue(page: Page, label: string) {
  const tile = page
    .getByRole("main")
    .locator("div.rounded-2xl", { has: page.getByText(label, { exact: true }) })
    .first();
  return (await tile.locator("div.text-2xl").innerText()).trim();
}

test.describe("Anggota — beranda", () => {
  test("menampilkan nama, program aktif dan tombol laporan", async ({ page }) => {
    const run = readRun();
    await page.goto("/dashboard");
    await expect(page.getByText("Assalamu'alaikum,")).toBeVisible();
    await expect(page.getByRole("heading", { name: run.member.name })).toBeVisible();
    await expect(page.getByText("Program Aktif")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Subuh Berjamaah" })).toBeVisible();
  });
});

test.describe.serial("Anggota — submit Subuh", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mengubah data: dijalankan sekali");
  });

  test("tombol 'Isi Laporan Subuh Hari Ini' membuka form bertanggal hari ini", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Isi Laporan Subuh Hari Ini" }).click();
    await expect(page).toHaveURL(/\/dashboard\/report\/subuh-berjamaah$/);
    await expect(page.getByText("Bagaimana Subuh hari ini?")).toBeVisible();
    await expect(page.getByText("Tanggal laporan otomatis hari ini")).toBeVisible();
  });

  test("validasi: harus memilih Berjamaah atau Sendiri", async ({ page }) => {
    await page.goto("/dashboard/report/subuh-berjamaah");
    await page.getByRole("button", { name: "Kirim Laporan" }).click();
    await expect(page.getByText("Pilih salah satu: Berjamaah atau Sendiri")).toBeVisible();
  });

  test("koneksi putus: pesan jelas, tidak ada data tersimpan", async ({ page, context }) => {
    const run = readRun();
    await page.goto("/dashboard/report/subuh-berjamaah");
    await page.getByText("Sendiri", { exact: true }).click();
    await context.setOffline(true);
    await page.getByRole("button", { name: "Kirim Laporan" }).click();
    await expect(page.getByText("Tidak dapat terhubung ke server")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim Laporan" })).toBeEnabled();
    await context.setOffline(false);
    expect(
      await prisma.activity.count({ where: { userId: run.member.id, date: todayInTz() } }),
    ).toBe(0);
  });

  test("submit BERJAMAAH tersimpan pada tanggal hari ini (WIB)", async ({ page }) => {
    const run = readRun();
    await page.goto("/dashboard/report/subuh-berjamaah");
    await page.getByText("Berjamaah", { exact: true }).click();
    await page.getByLabel(/Catatan/).fill("E2E: berjamaah di masjid asrama");
    await page.getByRole("button", { name: "Kirim Laporan" }).click();

    await expect(page.getByText("Laporan tersimpan")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Anda sudah mengisi laporan hari ini" }),
    ).toBeVisible();

    const row = await prisma.activity.findFirstOrThrow({
      where: { userId: run.member.id, date: todayInTz() },
    });
    expect(toDateKey(row.date)).toBe(toDateKey(todayInTz()));
    expect(row.status).toBe("JAMAAH");
    expect(row.notes).toBe("E2E: berjamaah di masjid asrama");
    expect(
      await prisma.log.count({ where: { userId: run.member.id, action: "SUBMIT_ACTIVITY" } }),
    ).toBe(1);
  });

  test("sudah mengisi: form tidak tampil lagi, beranda menampilkan status", async ({ page }) => {
    await page.goto("/dashboard/report/subuh-berjamaah");
    await expect(page.getByText("Anda sudah mengisi laporan hari ini")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim Laporan" })).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(page.getByText("Anda sudah mengisi laporan hari ini")).toBeVisible();
    await expect(page.getByRole("link", { name: "Isi Laporan Subuh Hari Ini" })).toHaveCount(0);
  });
});

test.describe("Anggota — statistik & riwayat", () => {
  test("angka statistik sesuai data di database", async ({ page }) => {
    const run = readRun();
    const expected = await expectedMonthlyStats(run.member.id, run.programSlug);
    await page.goto("/dashboard/stats");

    await expect(
      page.getByRole("img", { name: `Persentase berjamaah ${expected.percentage}%` }),
    ).toBeVisible();
    expect(await tileValue(page, "Total hari")).toBe(String(expected.daysInMonth));
    expect(await tileValue(page, "Berjamaah")).toBe(String(expected.jamaah));
    expect(await tileValue(page, "Sendiri")).toBe(String(expected.sendiri));
    expect(await tileValue(page, "Belum isi")).toBe(String(expected.missed));
    await expect(
      page.getByText(`${expected.jamaah} dari ${expected.effectiveDays} hari`),
    ).toBeVisible();

    // Calendar: one labelled item per day of the month.
    await expect(
      page.getByRole("list", { name: "Kalender laporan" }).locator("li:not([aria-hidden])"),
    ).toHaveCount(expected.daysInMonth);
  });

  test("grafik per pekan menampilkan tooltip saat disentuh", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover hanya di desktop");
    const expected = await expectedMonthlyStats(readRun().member.id, readRun().programSlug);
    test.skip(expected.effectiveDays === 0, "bulan ini belum punya hari terhitung");
    await page.goto("/dashboard/stats");
    await page.locator(".recharts-bar-rectangle").first().hover();
    await expect(page.locator(".recharts-tooltip-wrapper")).toContainText("Berjamaah");
  });

  test("riwayat: Tanggal | Status sesuai jumlah hari terhitung", async ({ page }) => {
    const run = readRun();
    const expected = await expectedMonthlyStats(run.member.id, run.programSlug);
    const listed = expected.days.filter((d) =>
      ["JAMAAH", "SENDIRI", "MISSED", "PENDING"].includes(d.state),
    ).length;
    await page.goto("/dashboard/history");
    await expect(page.getByRole("columnheader", { name: "Tanggal" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(listed);
  });

  test("filter bulan tidak bisa melewati bulan berjalan", async ({ page }) => {
    await page.goto("/dashboard/stats?month=2999-01");
    await expect(page.getByRole("button", { name: "Bulan berikutnya" })).toBeDisabled();
  });

  // Regression: same-route query navigations used to hang forever in production
  // builds when a loading.tsx wrapped the segment (Next.js 15.5). Clicks, not goto().
  for (const path of ["/dashboard/stats", "/dashboard/history"]) {
    test(`${path}: klik bulan sebelumnya lalu kembali`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const current = await page.locator("main h1 + p").innerText();

      await page.getByRole("link", { name: /Bulan sebelumnya/ }).click();
      await expect(page).toHaveURL(/month=\d{4}-\d{2}/, { timeout: 15_000 });
      await expect(page.locator("main h1 + p")).not.toHaveText(current);

      await page.getByRole("link", { name: /Bulan berikutnya/ }).click();
      await expect(page.locator("main h1 + p")).toHaveText(current, { timeout: 15_000 });
    });
  }
});

test.describe("Anggota — otorisasi", () => {
  test("USER tidak bisa membuka halaman admin", async ({ page }) => {
    for (const path of ["/admin/dashboard", "/admin/members", "/admin/programs"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("USER ditolak saat export CSV (403)", async ({ page }) => {
    const res = await page.request.get("/api/admin/export");
    expect(res.status()).toBe(403);
  });

  test("menu Admin tidak tampil untuk USER", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /^Admin$|Dashboard admin/ })).toHaveCount(0);
  });
});
