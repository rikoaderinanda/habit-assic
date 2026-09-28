-- Tadarus Qur'an: program kinds, weekly schedules and the passage read per report.

-- CreateEnum
CREATE TYPE "ProgramKind" AS ENUM ('SHALAT', 'TADARUS');

-- AlterEnum
ALTER TYPE "ActivityStatus" ADD VALUE 'HADIR';

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "kind" "ProgramKind" NOT NULL DEFAULT 'SHALAT',
ADD COLUMN     "schedule_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "ayah_from" SMALLINT,
ADD COLUMN     "ayah_to" SMALLINT,
ADD COLUMN     "surah_from" SMALLINT,
ADD COLUMN     "surah_to" SMALLINT;

-- Schedule holds ISO weekdays only (1 = Senin … 7 = Ahad).
ALTER TABLE "programs"
  ADD CONSTRAINT "programs_schedule_days_check"
  CHECK ("schedule_days" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]);

-- A reading is either absent or complete, and never runs backwards.
-- (Ayah upper bounds per surah are validated in the app: src/features/tadarus/lib/quran.ts.)
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_reading_complete_check"
  CHECK (
    ("surah_from" IS NULL AND "ayah_from" IS NULL AND "surah_to" IS NULL AND "ayah_to" IS NULL)
    OR ("surah_from" IS NOT NULL AND "ayah_from" IS NOT NULL AND "surah_to" IS NOT NULL AND "ayah_to" IS NOT NULL)
  ),
  ADD CONSTRAINT "activities_reading_range_check"
  CHECK (
    "surah_from" IS NULL
    OR (
      "surah_from" BETWEEN 1 AND 114 AND "surah_to" BETWEEN 1 AND 114
      AND "ayah_from" >= 1 AND "ayah_to" >= 1
      AND ("surah_to", "ayah_to") >= ("surah_from", "ayah_from")
    )
  );
