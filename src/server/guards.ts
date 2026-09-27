import "server-only";

import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/client";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  createdAt: Date;
};

/**
 * The signed-in, active user — read from the database on every request
 * (deduplicated per request by React `cache`). Returns null when there is no
 * session, the user no longer exists, or the account was deactivated.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  return prisma.user.findUnique({
    where: { id, isActive: true },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
});

/** For pages/layouts: redirect to /login when not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  // `/login` shows a "sign out" option when a stale session cookie is still present.
  if (!user) redirect("/login?error=SessionInvalid");
  return user;
}

/** For pages/layouts: USER is sent back to their dashboard. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Error thrown by action/route guards; callers map it to a response. */
export class AuthorizationError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthorizationError";
  }
}

/** For Server Actions and Route Handlers, where a redirect is not the right response. */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("UNAUTHENTICATED");
  return user;
}

export async function assertAdmin(): Promise<CurrentUser> {
  const user = await assertUser();
  if (user.role !== "ADMIN") throw new AuthorizationError("FORBIDDEN");
  return user;
}
