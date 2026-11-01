import { describe, expect, it } from "vitest";
import { capacityBetween, dailyHours, effectiveSprintLength, workingDaysBetween } from "./capacity";
import { parseDate } from "./dates";

// Sunday-Thursday week with one holiday on Tuesday 2026-11-03
const cal = { workingDays: [0, 1, 2, 3, 4], holidays: new Set(["2026-11-03"]) };

describe("dailyHours", () => {
  it("splits weekly hours evenly over working days", () => {
    expect(dailyHours(parseDate("2026-11-01"), 40, cal, [])).toBe(8); // Sunday
  });
  it("is zero on weekends, holidays and leave", () => {
    expect(dailyHours(parseDate("2026-11-06"), 40, cal, [])).toBe(0); // Friday
    expect(dailyHours(parseDate("2026-11-03"), 40, cal, [])).toBe(0); // holiday
    const leave = [{ startDate: parseDate("2026-11-02"), endDate: parseDate("2026-11-02") }];
    expect(dailyHours(parseDate("2026-11-02"), 40, cal, leave)).toBe(0);
  });
  it("handles a calendar with no working days", () => {
    expect(dailyHours(parseDate("2026-11-01"), 40, { workingDays: [], holidays: new Set() }, [])).toBe(0);
  });
});

describe("capacityBetween", () => {
  it("sums a week minus holiday and leave", () => {
    const leave = [{ startDate: parseDate("2026-11-04"), endDate: parseDate("2026-11-10") }];
    // Week Sun 1 - Sat 7: working Sun, Mon, (Tue holiday), Wed on leave, Thu on leave => 2 days
    expect(capacityBetween(parseDate("2026-11-01"), parseDate("2026-11-07"), 20, cal, leave)).toBe(8);
  });
});

describe("workingDaysBetween", () => {
  it("counts working days excluding holidays", () => {
    expect(workingDaysBetween(parseDate("2026-11-01"), parseDate("2026-11-14"), cal)).toBe(9);
  });
});

describe("effectiveSprintLength", () => {
  it("prefers LOB, then squad, then default", () => {
    expect(effectiveSprintLength(10, 21, 14)).toBe(10);
    expect(effectiveSprintLength(null, 21, 14)).toBe(21);
    expect(effectiveSprintLength(null, null, 14)).toBe(14);
  });
});
