"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, assertAdmin } from "@/server/guards";
import {
  setMemberActive,
  setMemberRole,
  type MemberUpdateOutcome,
} from "@/server/services/member.service";

const ERRORS: Record<Exclude<MemberUpdateOutcome, { ok: true }>["code"], string> = {
  NOT_FOUND: "Anggota tidak ditemukan.",
  SELF_CHANGE: "Anda tidak dapat mengubah akun Anda sendiri.",
  LAST_ADMIN: "Harus ada minimal satu admin aktif.",
  UNCHANGED: "Tidak ada perubahan.",
};

async function run(
  action: (adminId: string) => Promise<MemberUpdateOutcome>,
  success: string,
): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { ok: false, message: "Anda tidak memiliki akses admin." };
    throw error;
  }

  const outcome = await action(adminId);
  if (!outcome.ok) return { ok: false, message: ERRORS[outcome.code] };
  revalidatePath("/admin", "layout");
  return { ok: true, message: success };
}

const roleSchema = z.object({ userId: z.uuid(), role: z.enum(["USER", "ADMIN"]) });
const statusSchema = z.object({ userId: z.uuid(), isActive: z.boolean() });

export async function setMemberRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  const { userId, role } = parsed.data;
  return run(
    (adminId) => setMemberRole(adminId, userId, role),
    role === "ADMIN" ? "Anggota dijadikan admin." : "Akses admin dicabut.",
  );
}

export async function setMemberActiveAction(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  const { userId, isActive } = parsed.data;
  return run(
    (adminId) => setMemberActive(adminId, userId, isActive),
    isActive ? "Anggota diaktifkan kembali." : "Anggota dinonaktifkan.",
  );
}
