import { PrismaClient } from "@prisma/client";

import { computeMonthlyStats } from "@/features/attendance/lib/stats";
import { monthOf, todayInTz, toDateOnlyInTz } from "@/lib/date";

try {
  process.loadEnvFile(".env");
} catch {
  // Environment provided by the shell/CI.
}

export const prisma = new PrismaClient();

/** Expected numbers for a member this month, computed from what is in the DB right now. */
export async function expectedMonthlyStats(userId: string, programSlug: string) {
  const today = todayInTz();
  const month = monthOf(today);
  const [user, program] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.program.findUniqueOrThrow({ where: { slug: programSlug } }),
  ]);
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      programId: program.id,
      date: {
        gte: new Date(Date.UTC(month.year, month.month - 1, 1)),
        lt: new Date(Date.UTC(month.year, month.month, 1)),
      },
    },
  });
  return computeMonthlyStats({
    month,
    today,
    activities,
    bounds: {
      notBefore: [toDateOnlyInTz(user.createdAt), program.startDate],
      notAfter: [program.endDate],
    },
  });
}
