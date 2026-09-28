import { z } from "zod";

const dateKey = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid");

export const PROGRAM_KINDS = ["SHALAT", "TADARUS"] as const;

/** ISO weekdays, sorted and de-duplicated. Empty = every day. */
const scheduleDays = z
  .array(z.number().int().min(1).max(7))
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

const programFields = {
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(100, "Nama maksimal 100 karakter"),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter"),
  startDate: dateKey,
  endDate: dateKey,
  scheduleDays,
};

function windowIsValid(v: { startDate: string; endDate: string }) {
  return !v.startDate || !v.endDate || v.endDate >= v.startDate;
}
const windowError = {
  message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
  path: ["endDate"],
};

export const createProgramSchema = z
  .object({
    ...programFields,
    kind: z.enum(PROGRAM_KINDS, { error: "Pilih jenis program" }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Slug minimal 3 karakter")
      .max(64, "Slug maksimal 64 karakter")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gunakan huruf kecil, angka, dan tanda hubung"),
  })
  .refine(windowIsValid, windowError);

/** Slug and kind are immutable after creation: part of member URLs / shape of every report. */
export const updateProgramSchema = z
  .object({ ...programFields, id: z.uuid() })
  .refine(windowIsValid, windowError);

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type CreateProgramFormValues = z.input<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
