import "server-only";

import type { Prisma } from "@prisma/client";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";

import { logAction } from "./audit";

/** True when `email` is listed in ADMIN_EMAILS (case-insensitive). */
export function isBootstrapAdmin(email: string, adminEmails: readonly string[]): boolean {
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Runs after every successful Google sign-in:
 * - promotes ADMIN_EMAILS members to ADMIN (never demotes — admins manage roles in the app),
 * - refreshes name/photo from the Google profile,
 * - writes the LOGIN audit entry.
 */
export async function recordSignIn(input: {
  userId: string;
  name: string | null;
  image: string | null;
  isNewUser: boolean;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, role: true, name: true, image: true },
  });
  if (!user) return;

  const data: Prisma.UserUpdateInput = {};
  const promote = user.role !== "ADMIN" && isBootstrapAdmin(user.email, getEnv().ADMIN_EMAILS);
  if (promote) data.role = "ADMIN";
  if (input.name && input.name !== user.name) data.name = input.name;
  if (input.image && input.image !== user.image) data.image = input.image;

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: input.userId }, data });
  }

  if (promote) {
    await logAction("ROLE_CHANGE", input.userId, {
      from: user.role,
      to: "ADMIN",
      reason: "ADMIN_EMAILS",
    });
  }
  await logAction("LOGIN", input.userId, { provider: "google", isNewUser: input.isNewUser });
}
