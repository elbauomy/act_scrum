import { describe, expect, it } from "vitest";
import {
  computeSprintMetrics, cycleTimeDays, daySharesFor, forecastFinish, healthLevel, movingAverage, scheduleTasks,
  sprintHealth, sprintMemberCapacity, type MetricTask, type SprintSpan,
} from "./planning";
import { parseDate, toISODate } from "./dates";

const d = parseDate;
// Mon-Fri week, no holidays
const cal = { workingDays: [1, 2, 3, 4, 5], holidays: new Set<string>() };
const span = (id: string, a: string, b: string, overrides: Record<string, number> = {}): SprintSpan => ({ id, startDate: d(a), endDate: d(b), overrides });

describe("shared capacity between overlapping sprints", () => {
  it("gives a single sprint all of the hours", () => {
    const s = span("a", "2026-11-02", "2026-11-06");
    const r = sprintMemberCapacity({ sprint: s, squadSprints: [s], memberId: "m", weeklyHours: 40, cal, leaves: [] });
    expect(r.hours).toBe(40);
  });
  it("splits evenly when two sprints overlap", () => {
    const a = span("a", "2026-11-02", "2026-11-06");
    const b = span("b", "2026-11-02", "2026-11-06");
    expect(sprintMemberCapacity({ sprint: a, squadSprints: [a, b], memberId: "m", weeklyHours: 40, cal, leaves: [] }).hours).toBe(20);
  });
  it("honours an override and gives the rest to the other sprint", () => {
    const a = span("a", "2026-11-02", "2026-11-06", { m: 75 });
    const b = span("b", "2026-11-02", "2026-11-06");
    expect(sprintMemberCapacity({ sprint: a, squadSprints: [a, b], memberId: "m", weeklyHours: 40, cal, leaves: [] }).hours).toBe(30);
    expect(sprintMemberCapacity({ sprint: b, squadSprints: [a, b], memberId: "m", weeklyHours: 40, cal, leaves: [] }).hours).toBe(10);
  });
  it("flags overrides above 100%", () => {
    const a = span("a", "2026-11-02", "2026-11-06", { m: 80 });
    const b = span("b", "2026-11-02", "2026-11-06", { m: 80 });
    expect(sprintMemberCapacity({ sprint: a, squadSprints: [a, b], memberId: "m", weeklyHours: 40, cal, leaves: [] }).overAllocated).toBe(true);
  });
  it("only shares the overlapping days", () => {
    const a = span("a", "2026-11-02", "2026-11-06");
    const b = span("b", "2026-11-05", "2026-11-13");
    const shares = daySharesFor(d("2026-11-05"), "m", [a, b]);
    expect(shares).toEqual({ a: 0.5, b: 0.5 });
    // Mon-Wed full (24h) + Thu-Fri half (8h)
    expect(sprintMemberCapacity({ sprint: a, squadSprints: [a, b], memberId: "m", weeklyHours: 40, cal, leaves: [] }).hours).toBe(32);
  });
  it("subtracts leave and holidays", () => {
    const s = span("a", "2026-11-02", "2026-11-06");
    const leaves = [{ startDate: d("2026-11-03"), endDate: d("2026-11-03") }];
    const holiday = { ...cal, holidays: new Set(["2026-11-04"]) };
    expect(sprintMemberCapacity({ sprint: s, squadSprints: [s], memberId: "m", weeklyHours: 40, cal: holiday, leaves }).hours).toBe(24);
  });
});

describe("scheduleTasks", () => {
  const avail = () => 8; // 8h every day (callers pass real availability)
  const weekdayAvail = (_m: string, _s: string, day: Date) => ([0, 6].includes(day.getUTCDay()) ? 0 : 8);
  it("fills days in order and shares a member's hours between tasks", () => {
    const tasks = [
      { id: "t1", memberId: "m", squadId: "s", hours: 12, earliest: d("2026-11-02") },
      { id: "t2", memberId: "m", squadId: "s", hours: 8, earliest: d("2026-11-02") },
    ];
    const plans = scheduleTasks(tasks, avail, d("2026-11-02"));
    expect(toISODate(plans.get("t1")!.end!)).toBe("2026-11-03");
    expect(plans.get("t1")!.byDay).toEqual({ "2026-11-02": 8, "2026-11-03": 4 });
    expect(plans.get("t2")!.start && toISODate(plans.get("t2")!.start!)).toBe("2026-11-03");
    expect(toISODate(plans.get("t2")!.end!)).toBe("2026-11-04");
  });
  it("skips non-working days and never schedules in the past", () => {
    const plans = scheduleTasks([{ id: "t", memberId: "m", squadId: "s", hours: 16, earliest: d("2026-10-01") }], weekdayAvail, d("2026-11-06"));
    expect(toISODate(plans.get("t")!.start!)).toBe("2026-11-06"); // Friday
    expect(toISODate(plans.get("t")!.end!)).toBe("2026-11-09"); // Monday
  });
  it("keeps different members independent", () => {
    const plans = scheduleTasks(
      [
        { id: "a", memberId: "m1", squadId: "s", hours: 8, earliest: d("2026-11-02") },
        { id: "b", memberId: "m2", squadId: "s", hours: 8, earliest: d("2026-11-02") },
      ],
      avail,
      d("2026-11-02"),
    );
    expect(toISODate(plans.get("b")!.end!)).toBe("2026-11-02");
  });
  it("reports hours that do not fit", () => {
    const plans = scheduleTasks([{ id: "t", memberId: "m", squadId: "s", hours: 10, earliest: d("2026-11-02") }], () => 0, d("2026-11-02"), 5);
    expect(plans.get("t")!.unscheduledHours).toBe(10);
    expect(plans.get("t")!.end).toBeNull();
  });
});

const task = (id: string, est: number, over: Partial<MetricTask> = {}): MetricTask => ({
  id, estimate: est, done: false, doneAt: null, assigneeId: "m", addedAt: d("2026-11-02"), isBug: false, blocked: false, ...over,
});

describe("computeSprintMetrics", () => {
  const base = { start: d("2026-11-02"), end: d("2026-11-06"), cal, started: true, closed: false, today: d("2026-11-04") };
  it("computes done, remaining and reliability", () => {
    const tasks = [task("a", 10, { done: true, doneAt: new Date("2026-11-03T10:00:00Z") }), task("b", 10), task("c", 20, { isBug: true })];
    const m = computeSprintMetrics({ ...base, tasks, committed: { a: 10, b: 10, c: 20 } });
    expect(m.committedHours).toBe(40);
    expect(m.doneHours).toBe(10);
    expect(m.remainingHours).toBe(30);
    expect(m.reliabilityPct).toBe(25);
    expect(m.bugRatioPct).toBe(50);
    expect(m.scopeChangePct).toBe(0);
  });
  it("burns hours only when tasks are done and draws the ideal line", () => {
    const tasks = [task("a", 10, { done: true, doneAt: new Date("2026-11-03T10:00:00Z") }), task("b", 10)];
    const m = computeSprintMetrics({ ...base, tasks, committed: { a: 10, b: 10 } });
    const by = Object.fromEntries(m.burndown.map((p) => [p.date, p]));
    expect(by["2026-11-02"].actual).toBe(20);
    expect(by["2026-11-03"].actual).toBe(10);
    expect(by["2026-11-04"].actual).toBe(10);
    expect(by["2026-11-05"].actual).toBeNull(); // future
    expect(by["2026-11-02"].ideal).toBe(16);
    expect(by["2026-11-06"].ideal).toBe(0);
  });
  it("measures scope added and removed after start", () => {
    // a grew 10 -> 14, b was removed, d was added
    const tasks = [task("a", 14), task("d", 6, { addedAt: d("2026-11-04") })];
    const m = computeSprintMetrics({ ...base, tasks, committed: { a: 10, b: 8 } });
    expect(m.addedHours).toBe(10);
    expect(m.removedHours).toBe(8);
    expect(m.scopeChangePct).toBe(100);
    const by = Object.fromEntries(m.burndown.map((p) => [p.date, p]));
    expect(by["2026-11-03"].actual).toBe(14); // d not yet added
    expect(by["2026-11-04"].actual).toBe(20);
  });
  it("tracks per-member assigned and done hours", () => {
    const tasks = [task("a", 5, { done: true, doneAt: new Date("2026-11-03T10:00:00Z") }), task("b", 5, { assigneeId: "x" })];
    const m = computeSprintMetrics({ ...base, tasks, committed: {} });
    expect(m.byMember.m).toEqual({ assigned: 5, done: 5 });
    expect(m.byMember.x).toEqual({ assigned: 5, done: 0 });
  });
  it("uses current hours as the plan before the sprint starts", () => {
    const m = computeSprintMetrics({ ...base, started: false, tasks: [task("a", 12)], committed: {} });
    expect(m.committedHours).toBe(12);
    expect(m.reliabilityPct).toBeNull();
    expect(m.scopeChangePct).toBe(0);
  });
});

describe("sprintHealth", () => {
  const healthy = { committedHours: 100, doneHours: 50, remainingHours: 50, idealRemaining: 50, elapsed: 0.5, closed: false, scopeChangePct: 5, overloadedMembers: 0, members: 4, blockedOrSlipped: 0, openTasks: 10 };
  it("scores a sprint on track at 100", () => {
    const h = sprintHealth(healthy);
    expect(h.score).toBe(100);
    expect(h.level).toBe("green");
  });
  it("drops when behind, over-scoped, overloaded and blocked", () => {
    const h = sprintHealth({ ...healthy, doneHours: 10, remainingHours: 90, scopeChangePct: 40, overloadedMembers: 2, blockedOrSlipped: 5 });
    expect(h.parts.scope).toBe(0);
    expect(h.parts.load).toBe(50);
    expect(h.parts.blocked).toBe(50);
    expect(h.level).toBe("red");
  });
  it("has the agreed thresholds", () => {
    expect(healthLevel(80)).toBe("green");
    expect(healthLevel(79)).toBe("amber");
    expect(healthLevel(60)).toBe("amber");
    expect(healthLevel(59)).toBe("red");
  });
});

describe("velocity, forecast and cycle time", () => {
  it("averages the last three values", () => {
    expect(movingAverage([10, 20, 30, 40])).toBe(30);
    expect(movingAverage([])).toBeNull();
  });
  it("forecasts from average velocity per day", () => {
    const f = forecastFinish(60, [{ doneHours: 70, lengthDays: 14 }, { doneHours: 70, lengthDays: 14 }], d("2026-11-02"));
    expect(toISODate(f!)).toBe("2026-11-14"); // 5h/day -> 12 days
    expect(forecastFinish(10, [], d("2026-11-02"))).toBeNull();
    expect(toISODate(forecastFinish(0, [], d("2026-11-02"))!)).toBe("2026-11-02");
  });
  it("measures cycle time from history", () => {
    const ev = [
      { newValue: "IN_PROGRESS", changedAt: new Date("2026-11-02T08:00:00Z") },
      { newValue: "DONE", changedAt: new Date("2026-11-05T08:00:00Z") },
    ];
    expect(cycleTimeDays(ev, "IN_PROGRESS", new Date("2026-10-01T00:00:00Z"))).toBe(3);
    expect(cycleTimeDays([{ newValue: "DONE", changedAt: new Date("2026-11-05T08:00:00Z") }], "IN_PROGRESS", new Date("2026-11-03T08:00:00Z"))).toBe(2);
    expect(cycleTimeDays([], "COMMITTED", new Date())).toBeNull();
  });
});
