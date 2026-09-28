/**
 * Seeds master data only — the programs members can report on.
 * Users are never seeded: they are created on first Google sign-in.
 *
 * Idempotent: safe to run on every deploy. Existing programs keep any edits
 * admins made in the app (only missing programs are created).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROGRAMS = [
  {
    slug: "subuh-berjamaah",
    name: "Subuh Berjamaah",
    description: "Laporan harian pelaksanaan Shalat Subuh — berjamaah di masjid atau sendiri.",
    active: true,
    kind: "SHALAT",
    scheduleDays: [],
  },
  {
    slug: "tadarus-quran",
    name: "Tadarus Qur'an",
    description: "Tadarus bersama setiap pekan. Catat surah dan ayat yang sudah Anda baca.",
    active: true,
    kind: "TADARUS",
    scheduleDays: [1], // Senin — admins can change it in Kelola Program
  },
] as const;

async function main() {
  for (const program of PROGRAMS) {
    const result = await prisma.program.upsert({
      where: { slug: program.slug },
      update: {},
      create: { ...program, scheduleDays: [...program.scheduleDays] },
    });
    console.log(`✔ program "${result.name}" (${result.slug}) — active: ${result.active}`);
  }
}

main()
  .catch((error) => {
    console.error("✖ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
