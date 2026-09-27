type ProgramWindow = { active: boolean; startDate: Date | null; endDate: Date | null };

/** Whether members can report on `day` (date-only) for this program. */
export function isProgramOpenOn(program: ProgramWindow, day: Date): boolean {
  if (!program.active) return false;
  if (program.startDate && day.getTime() < program.startDate.getTime()) return false;
  if (program.endDate && day.getTime() > program.endDate.getTime()) return false;
  return true;
}
