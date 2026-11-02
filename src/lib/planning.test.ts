import { describe, expect, it } from "vitest";
import {
  computeSprintMetrics, cycleTimeDays, daySharesFor, forecastFinish, healthLevel, movingAverage, scheduleTasks,
  isPausedOn, pausedDayKeys, poolsFor, sprintHealth, sprintMemberCapacity, type MetricTask, type SprintSpan,
} from "./planning";
import { parseDate, toISODate } from "./dates";
import { addWorkingDays } from "./capacity";

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

describe("paused sprints", () => {
  const A = { ...span("A", "2026-11-02", "2026-11-06"), pauses: [{ start: d("2026-11-04"), end: d("2026-11-05") }] };
  const B = span("B", "2026-11-02", "2026-11-06");
  it("knows which days are paused, including a pause that is still open", () => {
    expect(isPausedOn(A, d("2026-11-03"))).toBe(false);
    expect(isPausedOn(A, d("2026-11-04"))).toBe(true);
    expect(isPausedOn(A, d("2026-11-05"))).toBe(true);
    expect(isPausedOn(A, d("2026-11-06"))).toBe(false);
    expect(isPausedOn({ ...B, pauses: [{ start: d("2026-11-04"), end: null }] }, d("2026-12-01"))).toBe(true);
    expect([...pausedDayKeys([{ start: d("2026-11-04"), end: null }], d("2026-11-02"), d("2026-11-10"), d("2026-11-06"))]).toEqual(["2026-11-04", "2026-11-05", "2026-11-06"]);
  });
  it("gives a paused sprint no hours on paused days and lets the other sprint have them", () => {
    const base = { squadSprints: [A, B], memberId: "m", weeklyHours: 40, cal, leaves: [] as { startDate: Date; endDate: Date }[] };
    // A: Mon, Tue, Fri shared with B (4h each = 12h); Wed and Thu paused (0). B: same shared days (12h) + the 2 paused days alone (16h)
    expect(sprintMemberCapacity({ ...base, sprint: A }).hours).toBe(12);
    expect(sprintMemberCapacity({ ...base, sprint: B }).hours).toBe(28);
  });
  it("moves an end date forward by working days", () => {
    const cal2 = { workingDays: [1, 2, 3, 4, 5], holidays: new Set(["2026-11-10"]) };
    expect(toISODate(addWorkingDays(d("2026-11-06"), 0, cal2))).toBe("2026-11-06");
    expect(toISODate(addWorkingDays(d("2026-11-06"), 1, cal2))).toBe("2026-11-09");
    expect(toISODate(addWorkingDays(d("2026-11-06"), 2, cal2))).toBe("2026-11-11"); // skips the holiday on the 10th
  });
});

describe("per-LOB hour pools", () => {
  it("reserves hours for a line of business and leaves the rest shared", () => {
    expect(poolsFor(20, { a: 12 }, "a")).toEqual({ lobWeekly: 12, sharedWeekly: 8 });
    expect(poolsFor(20, { a: 12 }, "b")).toEqual({ lobWeekly: 0, sharedWeekly: 8 });
    expect(poolsFor(20, {}, "a")).toEqual({ lobWeekly: 0, sharedWeekly: 20 });
  });
  it("never reserves more than the squad hours", () => {
    expect(poolsFor(10, { a: 8, b: 8 }, "b")).toEqual({ lobWeekly: 2, sharedWeekly: 0 });
  });
  it("gives a LOB sprint its reserved hours plus its share of the rest", () => {
    // 40h/week, 25h reserved for LOB a. Sprint A (LOB a) and sprint B (LOB b) overlap all week.
    const A = span("A", "2026-11-02", "2026-11-06");
    const B = span("B", "2026-11-02", "2026-11-06");
    const base = { squadSprints: [A, B], memberId: "m", weeklyHours: 40, cal, leaves: [] as { startDate: Date; endDate: Date }[] };
    const pa = poolsFor(40, { a: 25 }, "a");
    const pb = poolsFor(40, { a: 25 }, "b");
    // Sprint A: 25h of its own + half of the 15h shared. Sprint B: no own hours + half of the 15h shared.
    expect(sprintMemberCapacity({ ...base, sprint: A, lobSprints: [A], pools: pa }).hours).toBe(32.5);
    expect(sprintMemberCapacity({ ...base, sprint: B, lobSprints: [B], pools: pb }).hours).toBe(7.5);
  });
  it("shares reserved hours between overlapping sprints of the same LOB only", () => {
    const A1 = span("A1", "2026-11-02", "2026-11-06");
    const A2 = span("A2", "2026-11-02", "2026-11-06");
    const pools = poolsFor(40, { a: 40 }, "a");
    const r = sprintMemberCapacity({ sprint: A1, squadSprints: [A1, A2], lobSprints: [A1, A2], memberId: "m", weeklyHours: 40, pools, cal, leaves: [] });
    expect(r.hours).toBe(20);
  });
  it("is unchanged when nothing is reserved", () => {
    const s = span("a", "2026-11-02", "2026-11-06");
    const withPools = sprintMemberCapacity({ sprint: s, squadSprints: [s], memberId: "m", weeklyHours: 40, pools: poolsFor(40, {}, "a"), cal, leaves: [] });
    expect(withPools.hours).toBe(40);
  });
});

describe("scheduleTasks", () => {
  const avail = () => ({ lob: 0, shared: 8 }); // 8h shared hours every day (callers pass real availability)
  const weekdayAvail = (_m: string, _s: string, _l: string, day: Date) => ({ lob: 0, shared: [0, 6].includes(day.getUTCDay()) ? 0 : 8 });
  it("fills days in order and shares a member's hours between tasks", () => {
    const tasks = [
      { id: "t1", memberId: "m", squadId: "s", lobId: "l", hours: 12, earliest: d("2026-11-02") },
      { id: "t2", memberId: "m", squadId: "s", lobId: "l", hours: 8, earliest: d("2026-11-02") },
    ];
    const plans = scheduleTasks(tasks, avail, d("2026-11-02"));
    expect(toISODate(plans.get("t1")!.end!)).toBe("2026-11-03");
    expect(plans.get("t1")!.byDay).toEqual({ "2026-11-02": 8, "2026-11-03": 4 });
    expect(plans.get("t2")!.start && toISODate(plans.get("t2")!.start!)).toBe("2026-11-03");
    expect(toISODate(plans.get("t2")!.end!)).toBe("2026-11-04");
  });
  it("skips non-working days and never schedules in the past", () => {
    const plans = scheduleTasks([{ id: "t", memberId: "m", squadId: "s", lobId: "l", hours: 16, earliest: d("2026-10-01") }], weekdayAvail, d("2026-11-06"));
    expect(toISODate(plans.get("t")!.start!)).toBe("2026-11-06"); // Friday
    expect(toISODate(plans.get("t")!.end!)).toBe("2026-11-09"); // Monday
  });
  it("uses a LOB's reserved hours first and keeps them away from other LOBs", () => {
    // Member has 4h/day reserved for LOB a and 4h/day shared.
    const pools = (_m: string, _s: string, lobId: string) => ({ lob: lobId === "a" ? 4 : 0, shared: 4 });
    const plans = scheduleTasks(
      [
        { id: "a1", memberId: "m", squadId: "s", lobId: "a", hours: 8, earliest: d("2026-11-02") },
        { id: "b1", memberId: "m", squadId: "s", lobId: "b", hours: 8, earliest: d("2026-11-02") },
      ],
      pools,
      d("2026-11-02"),
    );
    // a1 takes 4 reserved + 4 shared on day 1. b1 gets only the shared 4h per day, so it needs 3 days (day 1 has none left).
    expect(plans.get("a1")!.byDay).toEqual({ "2026-11-02": 8 });
    expect(plans.get("b1")!.byDay).toEqual({ "2026-11-03": 4, "2026-11-04": 4 });
  });
  it("spends only part of each available hour on tasks when efficiency is below 1", () => {
    // 70% of an 8 h day goes into the task (the rest is meetings, vacation and so on)
    const plans = scheduleTasks([{ id: "t", memberId: "m", squadId: "s", lobId: "l", hours: 14, earliest: d("2026-11-02"), efficiency: 0.7 }], avail, d("2026-11-02"));
    const t = plans.get("t")!;
    expect(Object.keys(t.byDay)).toHaveLength(3);
    expect(t.byDay["2026-11-02"]).toBeCloseTo(5.6);
    expect(t.byDay["2026-11-04"]).toBeCloseTo(2.8);
    expect(Object.values(t.byDay).reduce((a, b) => a + b, 0)).toBeCloseTo(14);
    expect(toISODate(t.end!)).toBe("2026-11-04");
  });
  it("keeps different members independent", () => {
    const plans = scheduleTasks(
      [
        { id: "a", memberId: "m1", squadId: "s", lobId: "l", hours: 8, earliest: d("2026-11-02") },
        { id: "b", memberId: "m2", squadId: "s", lobId: "l", hours: 8, earliest: d("2026-11-02") },
      ],
      avail,
      d("2026-11-02"),
    );
    expect(toISODate(plans.get("b")!.end!)).toBe("2026-11-02");
  });
  it("reports hours that do not fit", () => {
    const plans = scheduleTasks([{ id: "t", memberId: "m", squadId: "s", lobId: "l", hours: 10, earliest: d("2026-11-02") }], () => ({ lob: 0, shared: 0 }), d("2026-11-02"), 5);
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
