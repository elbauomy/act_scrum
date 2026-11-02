// Pure capacity calculations (no database access) so they are easy to test.
import { addDays, eachDay, toISODate } from "./dates";

export type WorkCalendar = {
  /** 0 = Sunday ... 6 = Saturday */
  workingDays: number[];
  /** ISO dates "YYYY-MM-DD" */
  holidays: Set<string>;
};

export type LeaveRange = { startDate: Date; endDate: Date };

export function isWorkingDay(d: Date, cal: WorkCalendar): boolean {
  return cal.workingDays.includes(d.getUTCDay()) && !cal.holidays.has(toISODate(d));
}

export function isOnLeave(d: Date, leaves: LeaveRange[]): boolean {
  const t = d.getTime();
  return leaves.some((l) => l.startDate.getTime() <= t && t <= l.endDate.getTime());
}

/** Hours a member gives a squad on one day. */
export function dailyHours(
  d: Date,
  weeklyHours: number,
  cal: WorkCalendar,
  leaves: LeaveRange[],
): number {
  if (cal.workingDays.length === 0) return 0;
  if (!isWorkingDay(d, cal) || isOnLeave(d, leaves)) return 0;
  return weeklyHours / cal.workingDays.length;
}

/** Hours a member gives a squad between two dates (inclusive). */
export function capacityBetween(
  start: Date,
  end: Date,
  weeklyHours: number,
  cal: WorkCalendar,
  leaves: LeaveRange[],
): number {
  const total = eachDay(start, end).reduce((sum, d) => sum + dailyHours(d, weeklyHours, cal, leaves), 0);
  return Math.round(total * 100) / 100;
}

/** Number of working days (ignoring personal leave) between two dates (inclusive). */
export function workingDaysBetween(start: Date, end: Date, cal: WorkCalendar): number {
  return eachDay(start, end).filter((d) => isWorkingDay(d, cal)).length;
}

/** LOB value -> squad value -> system default. */
export function effectiveSprintLength(
  lobDays: number | null | undefined,
  squadDays: number | null | undefined,
  defaultDays: number,
): number {
  return lobDays ?? squadDays ?? defaultDays;
}

/** The date that is `n` working days after `from` (n = 0 returns `from`). Gives up after a year without a working day. */
export function addWorkingDays(from: Date, n: number, cal: WorkCalendar): Date {
  let d = from;
  let left = n;
  for (let guard = 0; left > 0 && guard < 800; guard++) {
    d = addDays(d, 1);
    if (isWorkingDay(d, cal)) left -= 1;
  }
  return d;
}
