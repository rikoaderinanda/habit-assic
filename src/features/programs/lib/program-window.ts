import { addDays, mondayIndex } from "@/lib/date";

type ProgramWindow = {
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  /** ISO weekdays (1 = Senin … 7 = Ahad); empty = every day. */
  scheduleDays: number[];
};

export const WEEKDAYS = [
  { iso: 1, short: "Sen", long: "Senin" },
  { iso: 2, short: "Sel", long: "Selasa" },
  { iso: 3, short: "Rab", long: "Rabu" },
  { iso: 4, short: "Kam", long: "Kamis" },
  { iso: 5, short: "Jum", long: "Jumat" },
  { iso: 6, short: "Sab", long: "Sabtu" },
  { iso: 7, short: "Ahad", long: "Ahad" },
] as const;

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: Date): number {
  return mondayIndex(day) + 1;
}

/** Whether `day` is on the program's weekly schedule (ignores active flag and window). */
export function isScheduledOn(program: Pick<ProgramWindow, "scheduleDays">, day: Date): boolean {
  return program.scheduleDays.length === 0 || program.scheduleDays.includes(isoWeekday(day));
}

/** Whether `day` lies inside the program's optional start/end window. */
export function isInProgramWindow(
  program: Pick<ProgramWindow, "startDate" | "endDate">,
  day: Date,
): boolean {
  if (program.startDate && day.getTime() < program.startDate.getTime()) return false;
  if (program.endDate && day.getTime() > program.endDate.getTime()) return false;
  return true;
}

/** Whether members can report on `day` (date-only) for this program. */
export function isProgramOpenOn(program: ProgramWindow, day: Date): boolean {
  return program.active && isInProgramWindow(program, day) && isScheduledOn(program, day);
}

/** First day on or after `from` the program is open, within two weeks; null if none. */
export function nextOpenDay(program: ProgramWindow, from: Date): Date | null {
  for (let i = 0; i < 14; i++) {
    const day = addDays(from, i);
    if (isProgramOpenOn(program, day)) return day;
  }
  return null;
}

/** Latest scheduled day in the program window on or before `onOrBefore`, within two weeks. */
export function lastScheduledDay(
  program: Omit<ProgramWindow, "active">,
  onOrBefore: Date,
): Date | null {
  for (let i = 0; i < 14; i++) {
    const day = addDays(onOrBefore, -i);
    if (isInProgramWindow(program, day) && isScheduledOn(program, day)) return day;
  }
  return null;
}

/** "Setiap hari", "Setiap Senin", "Senin & Kamis", "Sen, Rab, Jum". */
export function scheduleLabel(scheduleDays: number[]): string {
  const days = WEEKDAYS.filter((d) => scheduleDays.includes(d.iso));
  if (days.length === 0 || days.length === 7) return "Setiap hari";
  if (days.length === 1) return `Setiap ${days[0].long}`;
  if (days.length === 2) return `${days[0].long} & ${days[1].long}`;
  return days.map((d) => d.short).join(", ");
}
