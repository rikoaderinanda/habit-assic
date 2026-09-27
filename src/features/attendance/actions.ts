"use server";

import type { ActivityStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AuthorizationError, assertUser } from "@/server/guards";
import { submitActivityForToday } from "@/server/services/activity.service";

import { submitActivitySchema } from "./schemas";

type FieldName = "programId" | "status" | "notes";

export type SubmitActivityResult =
  | { ok: true; status: ActivityStatus; date: string }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "VALIDATION" | "PROGRAM_CLOSED" | "ALREADY_SUBMITTED" | "UNKNOWN";
      message: string;
      fieldErrors?: Partial<Record<FieldName, string>>;
    };

const MESSAGES = {
  PROGRAM_CLOSED: "Program ini sedang tidak menerima laporan.",
  ALREADY_SUBMITTED: "Anda sudah mengisi laporan hari ini.",
} as const;

export async function submitActivityAction(input: unknown): Promise<SubmitActivityResult> {
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

  const parsed = submitActivitySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<FieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "programId" || field === "status" || field === "notes") &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, code: "VALIDATION", message: "Periksa kembali isian Anda.", fieldErrors };
  }

  try {
    const outcome = await submitActivityForToday({
      userId: user.id,
      programId: parsed.data.programId,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    });
    if (!outcome.ok) return { ok: false, code: outcome.code, message: MESSAGES[outcome.code] };

    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");
    return outcome;
  } catch (error) {
    console.error("[submitActivity] failed", error);
    return { ok: false, code: "UNKNOWN", message: "Laporan gagal disimpan. Silakan coba lagi." };
  }
}
