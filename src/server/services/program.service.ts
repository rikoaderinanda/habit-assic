import "server-only";

import { Prisma, type ProgramKind } from "@prisma/client";
import { cache } from "react";

import type { CreateProgramInput, UpdateProgramInput } from "@/features/programs/schemas";
import { parseDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma/client";
import { logAction } from "@/server/audit";

const programSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  active: true,
  kind: true,
  scheduleDays: true,
  startDate: true,
  endDate: true,
} as const;

export type ProgramSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  kind: ProgramKind;
  /** ISO weekdays (1 = Senin … 7 = Ahad); empty = every day. */
  scheduleDays: number[];
  startDate: Date | null;
  endDate: Date | null;
};

/** Programs members can currently report on, oldest first (Subuh Berjamaah is the primary one). */
export const listActivePrograms = cache((): Promise<ProgramSummary[]> =>
  prisma.program.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: programSelect,
  }),
);

/** Active programs plus inactive ones the member has history in (for stats/history pickers). */
export const listProgramsForUser = cache((userId: string): Promise<ProgramSummary[]> =>
  prisma.program.findMany({
    where: { OR: [{ active: true }, { activities: { some: { userId } } }] },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: programSelect,
  }),
);

export const getProgramBySlug = cache((slug: string): Promise<ProgramSummary | null> =>
  prisma.program.findUnique({ where: { slug }, select: programSelect }),
);

// ─── Admin ────────────────────────────────────────────────────────────────────

export type ProgramWithUsage = ProgramSummary & { createdAt: Date; activityCount: number };

export async function listAllPrograms(): Promise<ProgramWithUsage[]> {
  const programs = await prisma.program.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: { ...programSelect, createdAt: true, _count: { select: { activities: true } } },
  });
  return programs.map(({ _count, ...p }) => ({ ...p, activityCount: _count.activities }));
}

const toDate = (key: string) => (key ? parseDateKey(key) : null);

export type ProgramMutationOutcome = { ok: true } | { ok: false; code: "SLUG_TAKEN" | "NOT_FOUND" };

export async function createProgram(
  actorId: string,
  input: CreateProgramInput,
): Promise<ProgramMutationOutcome> {
  try {
    const program = await prisma.program.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description || null,
        kind: input.kind,
        scheduleDays: input.scheduleDays,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
      },
      select: { id: true, slug: true },
    });
    await logAction("PROGRAM_CREATE", actorId, { programId: program.id, slug: program.slug });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, code: "SLUG_TAKEN" };
    }
    throw error;
  }
}

export async function updateProgram(
  actorId: string,
  input: UpdateProgramInput,
): Promise<ProgramMutationOutcome> {
  try {
    await prisma.program.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description || null,
        scheduleDays: input.scheduleDays,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { ok: false, code: "NOT_FOUND" };
    }
    throw error;
  }
  await logAction("PROGRAM_UPDATE", actorId, { programId: input.id, fields: "details" });
  return { ok: true };
}

export async function setProgramActive(
  actorId: string,
  programId: string,
  active: boolean,
): Promise<ProgramMutationOutcome> {
  const { count } = await prisma.program.updateMany({ where: { id: programId }, data: { active } });
  if (count === 0) return { ok: false, code: "NOT_FOUND" };
  await logAction("PROGRAM_UPDATE", actorId, { programId, active });
  return { ok: true };
}
