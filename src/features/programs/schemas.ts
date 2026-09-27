import { z } from "zod";

const dateKey = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid");

const programFields = {
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(100, "Nama maksimal 100 karakter"),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter"),
  startDate: dateKey,
  endDate: dateKey,
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
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Slug minimal 3 karakter")
      .max(64, "Slug maksimal 64 karakter")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gunakan huruf kecil, angka, dan tanda hubung"),
  })
  .refine(windowIsValid, windowError);

/** Slug is immutable after creation: it is part of member-facing URLs. */
export const updateProgramSchema = z
  .object({ ...programFields, id: z.uuid() })
  .refine(windowIsValid, windowError);

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
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
