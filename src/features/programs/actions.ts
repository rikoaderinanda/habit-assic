"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom, type ActionResult } from "@/lib/action-result";
import { AuthorizationError, assertAdmin } from "@/server/guards";
import {
  createProgram,
  setProgramActive,
  updateProgram,
  type ProgramMutationOutcome,
} from "@/server/services/program.service";

import { createProgramSchema, updateProgramSchema } from "./schemas";

type ProgramField = "name" | "slug" | "description" | "startDate" | "endDate";

async function adminOrError() {
  try {
    return { admin: await assertAdmin() };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: { ok: false, message: "Anda tidak memiliki akses admin." } as const };
    }
    throw error;
  }
}

function outcomeToResult(
  outcome: ProgramMutationOutcome,
  success: string,
): ActionResult<ProgramField> {
  if (outcome.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: success };
  }
  return outcome.code === "SLUG_TAKEN"
    ? {
        ok: false,
        message: "Slug sudah dipakai program lain.",
        fieldErrors: { slug: "Slug sudah dipakai" },
      }
    : { ok: false, message: "Program tidak ditemukan." };
}

export async function createProgramAction(input: unknown): Promise<ActionResult<ProgramField>> {
  const { admin, error } = await adminOrError();
  if (error) return error;

  const parsed = createProgramSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian Anda.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  return outcomeToResult(await createProgram(admin.id, parsed.data), "Program berhasil dibuat.");
}

export async function updateProgramAction(input: unknown): Promise<ActionResult<ProgramField>> {
  const { admin, error } = await adminOrError();
  if (error) return error;

  const parsed = updateProgramSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian Anda.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  return outcomeToResult(
    await updateProgram(admin.id, parsed.data),
    "Program berhasil diperbarui.",
  );
}

const toggleSchema = z.object({ id: z.uuid(), active: z.boolean() });

export async function setProgramActiveAction(input: unknown): Promise<ActionResult> {
  const { admin, error } = await adminOrError();
  if (error) return error;

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  return outcomeToResult(
    await setProgramActive(admin.id, parsed.data.id, parsed.data.active),
    parsed.data.active ? "Program diaktifkan." : "Program dinonaktifkan.",
  );
}
