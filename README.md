# Habit Assic

Aplikasi web mobile-first untuk monitoring program **Shalat Subuh Berjamaah** anggota asrama.
Dirancang sebagai *program management system* agar program lain (Tahajud, Puasa, Tilawah, dll.) bisa ditambahkan tanpa mengubah skema.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts · React Hook Form + Zod · Prisma 6 · PostgreSQL (Supabase) · Auth.js v5 (Google OAuth) · Vercel

Arsitektur, ERD, dan aturan bisnis: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Pengujian: [docs/TESTING.md](docs/TESTING.md) · Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Menjalankan secara lokal

Prasyarat: Node.js ≥ 20.9 (disarankan 24), npm.

```bash
npm install            # juga menjalankan `prisma generate`
cp .env.example .env   # isi nilainya (lihat komentar di file)
npm run dev            # http://localhost:3000
```

## Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run format` | Prettier |
| `npm test` | Vitest: unit + integration (butuh `DATABASE_URL`) |
| `npm run test:unit` | Unit test saja (tanpa database) |
| `npm run test:e2e` | Playwright E2E: build production di `:3100`, mobile + desktop |
| `npm run test:all` | Lint + typecheck + semua test |
| `npm run db:migrate` | Membuat & menerapkan migration (dev) |
| `npm run db:deploy` | Menerapkan migration (production) |
| `npm run db:seed` | Seed data master (program) |
| `npm run db:studio` | Prisma Studio |
| `npm run vercel-build` | Build Vercel (migration + seed hanya saat `VERCEL_ENV=production`) |
| `npm run smoke -- <url>` | Smoke test pasca-deploy (read-only) |

## Deploy

Vercel (region `sin1`) + Supabase (Singapura). Setiap push ke `main`: CI GitHub Actions (lint, typecheck, unit test, build) lalu deploy Vercel, dengan migration otomatis di Production. Langkah lengkap: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Status

- [x] Phase 1 — Analysis & Architecture
- [x] Phase 2 — Project Setup
- [x] Phase 3 — Database
- [x] Phase 4 — Authentication
- [x] Phase 5 — User Feature
- [x] Phase 6 — Admin Feature
- [x] Phase 7 — UI Polish
- [x] Phase 8 — Testing
- [x] Phase 9 — Deployment
- [ ] Phase 10 — Final Delivery
