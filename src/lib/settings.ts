import "server-only";
import { db } from "./db";
import type { WorkCalendar } from "./capacity";
import { toISODate } from "./dates";

/** The single settings row; created with defaults on first use. */
export async function getSettings() {
  return db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function getWorkCalendar(): Promise<WorkCalendar> {
  const [settings, holidays] = await Promise.all([getSettings(), db.holiday.findMany()]);
  return {
    workingDays: settings.workingDays,
    holidays: new Set(holidays.map((h) => toISODate(h.date))),
  };
}
