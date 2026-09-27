import { z } from "zod";

export const ACTIVITY_STATUSES = ["JAMAAH", "SENDIRI"] as const;

export const NOTES_MAX_LENGTH = 500;

/**
 * Report form payload. Deliberately has no `date` or `userId`: the server
 * derives both (today in APP_TIMEZONE, and the session user).
 */
export const submitActivitySchema = z.object({
  programId: z.uuid("Program tidak valid"),
  status: z.enum(ACTIVITY_STATUSES, { error: "Pilih salah satu: Berjamaah atau Sendiri" }),
  notes: z
    .string()
    .trim()
    .max(NOTES_MAX_LENGTH, `Catatan maksimal ${NOTES_MAX_LENGTH} karakter`)
    .optional(),
});

export type SubmitActivityInput = z.infer<typeof submitActivitySchema>;
