# Habit Assic — Testing

> Phase 8 deliverable. Terakhir dijalankan: 27 September 2026.

## Ringkasan hasil

| Lapisan | Tools | Jumlah | Hasil |
|---|---|---|---|
| Unit | Vitest | 50 test · 5 file | ✅ 50/50 |
| Integration (DB asli) | Vitest + Prisma → Supabase | 37 test · 4 file | ✅ 37/37 |
| End-to-end | Playwright (production build) | 53 skenario × 2 device (Pixel 7 · Desktop Chrome) | ✅ 90 lulus · 16 sengaja dilewati di mobile · 0 gagal (2× berturut-turut) |
| Aksesibilitas | axe-core, WCAG 2.1 AA | 9 halaman × 2 lebar | ✅ 0 pelanggaran |
| Statis | TypeScript strict, ESLint, Prettier | — | ✅ bersih |

"16 dilewati" adalah skenario yang mengubah data (submit, ubah role, buat program) atau butuh hover/keyboard. Skenario itu sengaja dijalankan **sekali** di desktop, bukan gagal.

## Checklist brief

| Brief | Bukti otomatis |
|---|---|
| **User ✓ Login** | `auth.spec.ts`: redirect halaman terproteksi, 401 di API, OAuth dimulai dengan `redirect_uri`/scope/PKCE yang benar, session membuka dashboard, logout menghapus session, open redirect ditolak. `auth-sync.test.ts`: user baru dibuat sebagai USER, `ADMIN_EMAILS` dipromosikan, log `LOGIN`. |
| **User ✓ Submit Subuh** | `member.spec.ts`: tombol "Isi Laporan Subuh Hari Ini", validasi pilihan, submit tersimpan di **tanggal WIB hari ini**, "Anda sudah mengisi laporan hari ini", koneksi putus tidak menyimpan apa pun. `activity.test.ts`: submit ganda dan 4 tap bersamaan menghasilkan 1 baris, program tertutup ditolak. |
| **User ✓ Statistik** | `member.spec.ts`: progress circle, tile, kalender dan riwayat **sama persis** dengan hasil hitung dari database. Tooltip chart, navigasi bulan. `stats.test.ts`: contoh brief (30 hari · 25/4/1 · **83%**), anggota baru, periode program, streak. |
| **Admin ✓ Dashboard** | `admin.spec.ts`: total = sudah + belum input, berjamaah + sendiri = sudah input, total = anggota aktif di DB, chart 14 hari, daftar belum input, tab program. |
| **Admin ✓ Monitoring** | `admin.spec.ts`: search, pagination (24 anggota fixture = 2 halaman), sorting dua arah, nilai baris = database, filter bulan, detail anggota, export CSV (BOM, header, jumlah baris, nama file), ubah role, nonaktifkan (session anggota langsung putus), kelola program. USER ditolak (`member.spec.ts`). |
| **Database ✓ Constraint** | `db-constraints.test.ts` (15 test): unique `(user, program, date)` termasuk submit bersamaan, FK & `RESTRICT`, cascade/`SET NULL`, CHECK periode program, panjang catatan, enum, RLS aktif di semua tabel, role `anon` Supabase melihat 0 baris. |

## Cara menjalankan

Prasyarat: `.env` terisi (lihat `.env.example`) dan program sudah di-seed (`npm run db:seed`). Browser Playwright cukup dipasang sekali dengan `npx playwright install chromium`.

```bash
npm test                 # unit + integration (±20 detik)
npm run test:unit        # unit saja, tanpa database
npm run test:integration # integration ke DATABASE_URL
npm run test:e2e         # build production ke .next-e2e, jalankan di :3100, uji (±5 menit)
npm run test:e2e:report  # buka laporan HTML Playwright terakhir
npm run test:all         # lint + typecheck + semua test
```

- E2E **tidak mengganggu** `npm run dev` (port 3000). Dist dir dan port-nya terpisah.
- Untuk menguji server yang sudah berjalan: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
- Integration & E2E memakai database di `DATABASE_URL`. Semua data test diberi tag (`it-…`, `e2e…`, `…@test.local`) dan **dihapus otomatis**. User asli tidak pernah diubah. Tetap disarankan memakai project Supabase **dev**, bukan production.

## Cara login di E2E

Google OAuth tidak bisa diotomasi dengan aman. Membuat *login backdoor* khusus test di kode production juga tidak kami lakukan. Sebagai gantinya, `tests/e2e/global-setup.ts` membuat **cookie session terenkripsi yang identik** dengan yang diterbitkan Auth.js setelah login Google berhasil (`AUTH_SECRET` dan salt yang sama). Dengan begitu:
- alur **sebelum** Google (tombol, redirect, parameter OAuth) diuji otomatis di `auth.spec.ts`;
- alur **setelah** login (session, guard, role dari DB) diuji otomatis di semua spec;
- round-trip ke Google sendiri diuji manual (checklist di bawah). Sudah dilakukan pemilik project pada Phase 4.

## Checklist manual (sebelum rilis)

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| M1 | Login dengan akun Google di `ADMIN_EMAILS` | Masuk ke `/dashboard`, badge Admin, menu Pengurus tampil |
| M2 | Login dengan akun Google lain | Masuk sebagai anggota, `/admin/*` dikembalikan ke `/dashboard` |
| M3 | Di HP: buka aplikasi → menu browser → "Add to Home Screen" | Ikon bulan-bintang hijau, terbuka tanpa address bar |
| M4 | Admin: Export CSV lalu buka di Excel/Google Sheets | Nama dengan huruf khusus tampil benar, kolom terpisah |

## Struktur

```text
tests/
├─ unit/          # logika murni: tanggal WIB, statistik, monitoring, CSV, redirect aman, inisial
├─ integration/   # Prisma ke DB: constraint, submit, admin service, sinkron login
├─ e2e/
│  ├─ global-setup.ts / global-teardown.ts   # fixture bertag + cookie session
│  ├─ support/    # fixture & perhitungan nilai yang diharapkan dari DB
│  ├─ auth.spec.ts · member.spec.ts · admin.spec.ts · quality.spec.ts
└─ stubs/         # "server-only" no-op untuk Vitest
```

## Bug yang ditemukan di Phase 8 (sudah diperbaiki)

| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| 1 | **Navigasi query macet di build production.** Pemilih bulan, pagination, sort, search dan tab program tidak pernah pindah halaman. | **Kritis.** Statistik bulan lalu dan monitoring tidak bisa dipakai di Vercel. Tidak terlihat di `npm run dev`. | Penyebabnya perilaku router Next.js 15.5: navigasi yang hanya mengubah `?query` di route yang sama tidak pernah commit bila segmen atau induknya punya `loading.tsx`. Diisolasi dengan eksperimen (prod vs dev, dengan/tanpa `loading.tsx`, dengan/tanpa prefetch). `loading.tsx` dihapus dari segmen ber-query; skeleton beranda dipindah ke route group `dashboard/(home)`; link query menampilkan spinner (`LinkPending`). Ada 5 test regresi yang **mengklik** link. |
| 2 | 20 link baris monitoring di-prefetch otomatis | Setiap buka halaman memicu 20 render server + query DB | `prefetch={false}` pada link per anggota |
| 3 | `connection_limit=1` | Semua query dari semua request dalam satu instance antre satu per satu | `connection_limit=5` (Supavisor transaction mode) |
| 4 | Tombol pagination nonaktif tanpa nama aksesibel | Pembaca layar membaca "tombol" kosong | `aria-label` |
| 5 | Label "(selesai)" pada tab program nonaktif, kontras < 4,5:1 | WCAG AA | Hapus `opacity-70` |

## Batasan yang diketahui

- **"Admin aktif terakhir tidak bisa dicabut"** belum diuji otomatis. Database dev berisi admin asli, sehingga kondisi "hanya satu admin" tidak bisa dibuat tanpa mengubah data asli. Logikanya sudah di-review dan berada dalam transaksi DB (`member.service.ts`).
- Pengujian memakai database remote (Supabase Seoul). Durasi test lebih lama dari produksi karena latensi dari Indonesia.
- E2E hanya di Chromium (Android/desktop). Safari iOS tidak diuji otomatis; cek manual M3.
