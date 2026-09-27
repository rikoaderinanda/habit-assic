import "server-only";

import type { LogAction, Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma/client";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). */
async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
    return ip ? ip.slice(0, 45) : null;
  } catch {
    // Called outside a request scope (scripts/tests).
    return null;
  }
}

/**
 * Append an audit log entry. Never throws: a failed audit write must not
 * break the user's action, so failures are reported to the server log only.
 */
export async function logAction(
  action: LogAction,
  userId: string | null,
  metadata?: Prisma.InputJsonObject,
): Promise<void> {
  try {
    await prisma.log.create({
      data: { action, userId, metadata, ipAddress: await clientIp() },
    });
  } catch (error) {
    console.error(`[audit] failed to record ${action}`, error);
  }
}
