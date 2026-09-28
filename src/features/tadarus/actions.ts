"use server";

import { revalidatePath } from "next/cache";

import { fieldErrorsFrom } from "@/lib/action-result";
import { AuthorizationError, assertUser } from "@/server/guards";
import { submitActivityForToday } from "@/server/services/activity.service";

import { submitTadarusSchema } from "./schemas";

type FieldName = "programId" | "surahFrom" | "ayahFrom" | "surahTo" | "ayahTo" | "notes";

export type SubmitTadarusResult =
  | { ok: true; date: string }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "VALIDATION" | "PROGRAM_CLOSED" | "ALREADY_SUBMITTED" | "UNKNOWN";
      message: string;
      fieldErrors?: Partial<Record<FieldName, string>>;
    };

const MESSAGES = {
  PROGRAM_CLOSED: "Hari ini tidak ada jadwal tadarus.",
  ALREADY_SUBMITTED: "Anda sudah mengisi bacaan tadarus hari ini.",
} as const;

export async function submitTadarusAction(input: unknown): Promise<SubmitTadarusResult> {
  let user;
  try {
    user = await assertUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sesi berakhir. Silakan login kembali.",
      };
    }
    throw error;
  }

  const parsed = submitTadarusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Periksa kembali isian Anda.",
      fieldErrors: fieldErrorsFrom<FieldName>(parsed.error.issues),
    };
  }

  const { programId, notes, ...reading } = parsed.data;
  try {
    const outcome = await submitActivityForToday({
      userId: user.id,
      programId,
      status: "HADIR",
      notes: notes || null,
      reading,
    });
    if (!outcome.ok) return { ok: false, code: outcome.code, message: MESSAGES[outcome.code] };

    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true, date: outcome.date };
  } catch (error) {
    console.error("[submitTadarus] failed", error);
    return { ok: false, code: "UNKNOWN", message: "Bacaan gagal disimpan. Silakan coba lagi." };
  }
}
