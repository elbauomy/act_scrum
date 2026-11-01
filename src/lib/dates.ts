// Date-only helpers. All calendar dates are handled as UTC midnight so that
// time zones never move a day.

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-11-01" -> Date at UTC midnight. Throws on invalid input. */
export function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || toISODate(d) !== value) throw new Error(`Invalid date: ${value}`);
  return d;
}

/** Date -> "2026-11-01" */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function todayUTC(): Date {
  return parseDate(new Date().toISOString().slice(0, 10));
}

/** Monday-based week start is not assumed: the week starts on the given weekday. */
export function startOfWeek(d: Date, weekStartsOn = 0): Date {
  const diff = (d.getUTCDay() - weekStartsOn + 7) % 7;
  return addDays(d, -diff);
}

/** Every date from start to end, both inclusive. */
export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) days.push(d);
  return days;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
