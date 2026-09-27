import { expect, test } from "@playwright/test";

import { expectedMonthlyStats, prisma } from "./support/db";
import { readRun, STATE } from "./support/fixtures";

test.use({ storageState: STATE.admin });

const num = (text: string) => Number.parseInt(text.replace(/[^\d-]/g, ""), 10);

test.describe("Admin — dashboard", () => {
  test("statistik hari ini konsisten", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const section = page.getByRole("region", { name: "Statistik hari ini" });
    const value = async (label: string) =>
      num(
        await section
          .locator("div.rounded-2xl", { has: page.getByText(label, { exact: true }) })
          .locator("div.text-2xl")
          .innerText(),
      );

    const total = await value("Total anggota");
    const reported = await value("Sudah input");
    const pending = await value("Belum input");
    const jamaah = await value("Berjamaah");
    const sendiri = await value("Sendiri");

    expect(total).toBe(await prisma.user.count({ where: { isActive: true } }));
    expect(reported + pending).toBe(total);
    expect(jamaah + sendiri).toBe(reported);
    await expect(page.getByRole("heading", { name: "14 hari terakhir" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Belum input hari ini/ })).toBeVisible();
  });
});

test.describe("Admin — monitoring anggota", () => {
  test("search, pagination dan nilai baris sesuai database", async ({ page }) => {
    const run = readRun();
    await page.goto("/admin/members");
    await page.getByLabel("Cari anggota").fill(run.tag);
    await expect(page).toHaveURL(new RegExp(`q=${run.tag}`));
    await expect(
      page.getByText(`Menampilkan 1–20 dari ${run.taggedMembers} anggota`),
    ).toBeVisible();

    await page.getByRole("link", { name: "Halaman berikutnya" }).click();
    await expect(
      page.getByText(`Menampilkan 21–${run.taggedMembers} dari ${run.taggedMembers} anggota`),
    ).toBeVisible();

    const expected = await expectedMonthlyStats(run.member.id, run.programSlug);
    await page.getByLabel("Cari anggota").fill(`${run.tag}-member`);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    const row = page.locator("tbody tr").first();
    await expect(row).toContainText(run.member.name);
    await expect(row).toContainText(
      `${expected.jamaah + expected.sendiri}/${expected.effectiveDays}`,
    );
    await expect(row).toContainText(`${expected.percentage}%`);
  });

  test("sorting persentase naik/turun", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kolom lengkap hanya di desktop");
    const run = readRun();
    const percentages = async () =>
      (await page.locator("tbody tr td:nth-child(5)").allInnerTexts()).map(num);

    await page.goto(`/admin/members?q=${run.tag}&sort=percentage&dir=desc`);
    const desc = await percentages();
    expect(desc).toEqual([...desc].sort((a, b) => b - a));

    await page.getByRole("link", { name: /^Persentase/ }).click();
    await expect(page).toHaveURL(/dir=asc/);
    const asc = await percentages();
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });

  test("filter bulan: nilai tidak valid kembali ke bulan berjalan", async ({ page }) => {
    const current = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      month: "long",
      year: "numeric",
    }).format(new Date());
    for (const month of ["abc", "2999-01", "2026-13"]) {
      await page.goto(`/admin/members?month=${month}`);
      await expect(page.getByText(`Subuh Berjamaah · ${current}`)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Bulan berikutnya" })).toBeDisabled();
  });

  test("detail anggota: riwayat Tanggal | Status", async ({ page }) => {
    const run = readRun();
    const expected = await expectedMonthlyStats(run.target.id, run.programSlug);
    await page.goto(`/admin/members/${run.target.id}`);
    await expect(page.getByRole("heading", { name: run.target.name })).toBeVisible();
    const listed = expected.days.filter((d) =>
      ["JAMAAH", "SENDIRI", "MISSED", "PENDING"].includes(d.state),
    ).length;
    await expect(page.locator("tbody tr")).toHaveCount(listed);
  });

  test("detail anggota: klik bulan sebelumnya (regresi navigasi query)", async ({ page }) => {
    const run = readRun();
    await page.goto(`/admin/members/${run.target.id}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /Bulan sebelumnya/ }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: run.target.name })).toBeVisible();
  });
});

test.describe.serial("Admin — aksi yang mengubah data", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mengubah data: dijalankan sekali");
  });

  test("export CSV mengikuti filter", async ({ page }) => {
    const run = readRun();
    const res = await page.request.get(`/api/admin/export?program=${run.programSlug}&q=${run.tag}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toMatch(/subuh-berjamaah-\d{4}-\d{2}\.csv/);
    const body = await res.body();
    // UTF-8 BOM so Excel opens Indonesian names correctly (res.text() strips it).
    expect([...body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = body.subarray(3).toString("utf8");
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(
      "Nama,Email,Jumlah Jamaah,Jumlah Sendiri,Belum Isi,Total Input,Hari Terhitung,Persentase (%)",
    );
    expect(lines).toHaveLength(run.taggedMembers + 1);
    expect(await prisma.log.count({ where: { userId: run.admin.id, action: "EXPORT_CSV" } })).toBe(
      1,
    );
  });

  test("jadikan admin lalu cabut kembali", async ({ page }) => {
    const run = readRun();
    await page.goto(`/admin/members/${run.target.id}`);
    await page.getByRole("button", { name: "Jadikan admin" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Jadikan admin" }).click();
    await expect(page.getByText("Anggota dijadikan admin.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cabut admin" })).toBeVisible();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: run.target.id } })).role).toBe(
      "ADMIN",
    );

    await page.getByRole("button", { name: "Cabut admin" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cabut admin" }).click();
    await expect(page.getByText("Akses admin dicabut.")).toBeVisible();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: run.target.id } })).role).toBe(
      "USER",
    );
  });

  test("nonaktifkan anggota memutus session-nya, aktifkan kembali memulihkan", async ({
    page,
    browser,
  }) => {
    const run = readRun();
    await page.goto(`/admin/members/${run.target.id}`);
    await page.getByRole("button", { name: "Nonaktifkan" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Nonaktifkan" }).click();
    await expect(page.getByText("Anggota dinonaktifkan.")).toBeVisible();

    const targetContext = await browser.newContext({ storageState: STATE.target });
    const targetPage = await targetContext.newPage();
    await targetPage.goto("/dashboard");
    await expect(targetPage).toHaveURL(/\/login/);
    await expect(targetPage.getByText("Sesi tidak berlaku")).toBeVisible();

    await page.getByRole("button", { name: "Aktifkan kembali" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Aktifkan" }).click();
    await expect(page.getByText("Anggota diaktifkan kembali.")).toBeVisible();
    await targetPage.goto("/dashboard");
    await expect(targetPage).toHaveURL(/\/dashboard$/);
    await targetContext.close();
  });

  test("admin tidak bisa mengubah akunnya sendiri", async ({ page }) => {
    const run = readRun();
    await page.goto(`/admin/members/${run.admin.id}`);
    await expect(page.getByText("Ini akun Anda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nonaktifkan" })).toHaveCount(0);
  });

  test("buat program baru (dengan validasi) lalu nonaktifkan", async ({ page }) => {
    const run = readRun();
    const name = `${run.tag} Tahajud`;
    await page.goto("/admin/programs");
    await page.getByRole("button", { name: "Program baru" }).click();
    await page.getByLabel("Nama program").fill(name);
    await expect(page.getByLabel("Slug (alamat URL)")).toHaveValue(`${run.tag}-tahajud`);
    await page.getByLabel("Mulai").fill("2030-01-10");
    await page.getByLabel("Selesai").fill("2030-01-01");
    await page.getByRole("button", { name: "Buat program" }).click();
    await expect(page.getByText("Tanggal selesai tidak boleh sebelum tanggal mulai")).toBeVisible();

    await page.getByLabel("Selesai").fill("");
    await page.getByRole("button", { name: "Buat program" }).click();
    await expect(page.getByText("Program berhasil dibuat.")).toBeVisible();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("switch", { name: `Nonaktifkan ${name}` }).click();
    await expect(page.getByText("Program dinonaktifkan.")).toBeVisible();
    expect(
      (await prisma.program.findUniqueOrThrow({ where: { slug: `${run.tag}-tahajud` } })).active,
    ).toBe(false);
  });

  test("tab program di dashboard berpindah program (regresi navigasi query)", async ({ page }) => {
    const run = readRun();
    const name = `${run.tag} Tahajud`;
    await page.goto("/admin/dashboard");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("navigation", { name: "Pilih program" })
      .getByRole("link", { name: new RegExp(name) })
      .click();
    await expect(page).toHaveURL(new RegExp(`program=${run.tag}-tahajud`), { timeout: 15_000 });
    await expect(page.getByText(new RegExp(`^${name} ·`))).toBeVisible();
  });
});
