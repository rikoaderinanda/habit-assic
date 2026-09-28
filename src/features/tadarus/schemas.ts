import { z } from "zod";

import { NOTES_MAX_LENGTH } from "@/features/attendance/schemas";

import { SURAH_COUNT, ayahIndex, getSurah } from "./lib/quran";

const surah = z
  .number({ error: "Pilih surah" })
  .int()
  .min(1, "Pilih surah")
  .max(SURAH_COUNT, "Pilih surah");
const ayah = z.number({ error: "Isi nomor ayat" }).int("Isi nomor ayat").min(1, "Minimal ayat 1");

/**
 * Tadarus report: the passage read, from surah:ayat through surah:ayat.
 * Like the Shalat form it has no date or user — the server derives both.
 */
export const submitTadarusSchema = z
  .object({
    programId: z.uuid("Program tidak valid"),
    surahFrom: surah,
    ayahFrom: ayah,
    surahTo: surah,
    ayahTo: ayah,
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH, `Catatan maksimal ${NOTES_MAX_LENGTH} karakter`)
      .optional(),
  })
  .superRefine((v, ctx) => {
    for (const [s, a, field] of [
      [v.surahFrom, v.ayahFrom, "ayahFrom"],
      [v.surahTo, v.ayahTo, "ayahTo"],
    ] as const) {
      const max = getSurah(s)?.ayahs;
      if (max && a > max) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${getSurah(s)!.name} hanya ${max} ayat`,
        });
      }
    }
    const from = getSurah(v.surahFrom) && ayahIndex({ surah: v.surahFrom, ayah: v.ayahFrom });
    const to = getSurah(v.surahTo) && ayahIndex({ surah: v.surahTo, ayah: v.ayahTo });
    if (from && to && to < from) {
      ctx.addIssue({
        code: "custom",
        path: ["ayahTo"],
        message: "Akhir bacaan tidak boleh sebelum awal bacaan",
      });
    }
  });

export type SubmitTadarusInput = z.infer<typeof submitTadarusSchema>;
