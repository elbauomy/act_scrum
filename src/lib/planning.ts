// Pure planning and metric logic (no database access) so it is easy to test.
import { addDays, eachDay, toISODate } from "./dates";
import { dailyHours, isWorkingDay, type LeaveRange, type WorkCalendar } from "./capacity";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sprint capacity with overlapping sprints
// ---------------------------------------------------------------------------

export type SprintSpan = {
  id: string;
  startDate: Date;
  endDate: Date;
  /** memberId -> percent (0-100) of the member's hours this sprint gets while sprints overlap */
  overrides: Record<string, number>;
  /** Periods the sprint was on hold. `end` is the last paused day, or null while it is still paused. */
  pauses?: { start: Date; end: Date | null }[];
};

/** Was the sprint on hold on this day? */
export function isPausedOn(s: SprintSpan, day: Date): boolean {
  const t = day.getTime();
  return (s.pauses ?? []).some((p) => p.start.getTime() <= t && (p.end == null || t <= p.end.getTime()));
}

/** The days of a sprint that fall inside a pause, as ISO dates (a pause still open counts up to `today`). */
export function pausedDayKeys(pauses: { start: Date; end: Date | null }[], from: Date, to: Date, today: Date): Set<string> {
  const keys = new Set<string>();
  for (const p of pauses) {
    const last = p.end ?? today;
    for (const d of eachDay(p.start.getTime() > from.getTime() ? p.start : from, last.getTime() < to.getTime() ? last : to)) keys.add(toISODate(d));
  }
  return keys;
}

/** Share (0-1) of a member's hours on one day that each covering sprint gets. */
export function daySharesFor(day: Date, memberId: string, sprints: SprintSpan[]): Record<string, number> {
  // A sprint that is on hold on that day does not take part of the member's hours.
  const covering = sprints.filter((s) => s.startDate.getTime() <= day.getTime() && day.getTime() <= s.endDate.getTime() && !isPausedOn(s, day));
  const shares: Record<string, number> = {};
  const overridden = covering.filter((s) => s.overrides[memberId] != null);
  const rest = covering.filter((s) => s.overrides[memberId] == null);
  const used = overridden.reduce((sum, s) => sum + s.overrides[memberId] / 100, 0);
  for (const s of overridden) shares[s.id] = s.overrides[memberId] / 100;
  const each = rest.length ? Math.max(0, 1 - used) / rest.length : 0;
  for (const s of rest) shares[s.id] = each;
  return shares;
}

export type MemberCapacity = { hours: number; overAllocated: boolean };

/** How a member's weekly hours in one squad are pooled for one line of business. */
export type HourPools = {
  /** Hours per week reserved for this line of business only */
  lobWeekly: number;
  /** Hours per week left over, shared by every line of business of the squad */
  sharedWeekly: number;
};

/**
 * Split a membership's hours into the pool of one LOB and the shared pool.
 * `allocations` maps lobId -> reserved hours per week (only LOBs of this squad). Reserved hours never exceed the total.
 */
export function poolsFor(weeklyHours: number, allocations: Record<string, number>, lobId: string): HourPools {
  let left = Math.max(0, weeklyHours);
  let lobWeekly = 0;
  let reserved = 0;
  for (const [id, hours] of Object.entries(allocations)) {
    const h = Math.min(Math.max(0, hours), left);
    left -= h;
    reserved += h;
    if (id === lobId) lobWeekly = h;
  }
  return { lobWeekly, sharedWeekly: Math.max(0, weeklyHours - reserved) };
}

/**
 * Hours one member can give one sprint, after weekends, holidays, leave and sharing with overlapping sprints.
 * The LOB's reserved hours are shared only with other sprints of the same LOB; the remaining squad hours are
 * shared with every sprint of the squad that covers the day.
 */
export function sprintMemberCapacity(args: {
  sprint: SprintSpan;
  /** All sprints of the squad (any line of business) */
  squadSprints: SprintSpan[];
  /** Sprints of the same line of business as `sprint` (including it). Defaults to the squad's sprints. */
  lobSprints?: SprintSpan[];
  memberId: string;
  /** Squad hours per week. With `pools` this is ignored. */
  weeklyHours: number;
  pools?: HourPools;
  cal: WorkCalendar;
  leaves: LeaveRange[];
}): MemberCapacity {
  const { sprint, squadSprints, memberId, cal, leaves } = args;
  const pools = args.pools ?? { lobWeekly: 0, sharedWeekly: args.weeklyHours };
  const lobSprints = args.lobSprints ?? squadSprints;
  let hours = 0;
  let overAllocated = false;
  for (const day of eachDay(sprint.startDate, sprint.endDate)) {
    const shared = daySharesFor(day, memberId, squadSprints);
    if (Object.values(shared).reduce((a, b) => a + b, 0) > 1.0001) overAllocated = true;
    hours += dailyHours(day, pools.sharedWeekly, cal, leaves) * (shared[sprint.id] ?? 0);
    if (pools.lobWeekly > 0) {
      const own = daySharesFor(day, memberId, lobSprints);
      if (Object.values(own).reduce((a, b) => a + b, 0) > 1.0001) overAllocated = true;
      hours += dailyHours(day, pools.lobWeekly, cal, leaves) * (own[sprint.id] ?? 0);
    }
  }
  return { hours: Math.round(hours * 100) / 100, overAllocated };
}

// ---------------------------------------------------------------------------
// Timeline scheduling (availability only, no dependencies)
// ---------------------------------------------------------------------------

export type ScheduleTask = {
  id: string;
  memberId: string;
  squadId: string;
  lobId: string;
  hours: number;
  /** Earliest day work may start (e.g. the sprint start) */
  earliest: Date;
  /** Share (0-1) of an available hour that goes into this task; meetings, vacation and so on take the rest. Default 1. */
  efficiency?: number;
};

export type TaskPlan = {
  start: Date | null;
  end: Date | null;
  /** Hours that did not fit in the planning horizon */
  unscheduledHours: number;
  byDay: Record<string, number>;
};

/**
 * Fill each member's days with their tasks, in the order given.
 * A task first uses the hours the member reserved for its line of business, then the squad's shared hours.
 * Those pools are shared by all of the member's tasks, across overlapping sprints.
 */
export function scheduleTasks(
  orderedTasks: ScheduleTask[],
  availability: (memberId: string, squadId: string, lobId: string, day: Date) => { lob: number; shared: number },
  today: Date,
  horizonDays = 400,
): Map<string, TaskPlan> {
  const left = new Map<string, number>();
  const plans = new Map<string, TaskPlan>();
  for (const t of orderedTasks) {
    const plan: TaskPlan = { start: null, end: null, unscheduledHours: 0, byDay: {} };
    let need = t.hours;
    let day = t.earliest.getTime() > today.getTime() ? t.earliest : today;
    const last = addDays(day, horizonDays);
    while (need > 1e-9 && day.getTime() <= last.getTime()) {
      const iso = toISODate(day);
      const lobKey = `${t.memberId}|${t.squadId}|L${t.lobId}|${iso}`;
      const sharedKey = `${t.memberId}|${t.squadId}|S|${iso}`;
      let pools: { lob: number; shared: number } | null = null;
      const pool = () => (pools ??= availability(t.memberId, t.squadId, t.lobId, day));
      const efficiency = t.efficiency && t.efficiency > 0 ? Math.min(1, t.efficiency) : 1;
      const needRaw = need / efficiency;
      const freeLob = left.get(lobKey) ?? pool().lob;
      const fromLob = Math.min(freeLob, needRaw);
      left.set(lobKey, freeLob - fromLob);
      const freeShared = left.get(sharedKey) ?? pool().shared;
      const fromShared = Math.min(freeShared, needRaw - fromLob);
      left.set(sharedKey, freeShared - fromShared);
      const take = (fromLob + fromShared) * efficiency;
      if (take > 1e-9) {
        plan.byDay[iso] = (plan.byDay[iso] ?? 0) + take;
        plan.start ??= day;
        plan.end = day;
        need -= take;
      }
      day = addDays(day, 1);
    }
    plan.unscheduledHours = Math.max(0, Math.round(need * 100) / 100);
    plans.set(t.id, plan);
  }
  return plans;
}

/** A task is slipping when its planned end is after the date it was supposed to finish. */
export function isSlipped(plannedEnd: Date | null, deadline: Date): boolean {
  return plannedEnd == null || plannedEnd.getTime() > deadline.getTime();
}

// ---------------------------------------------------------------------------
// Sprint metrics
// ---------------------------------------------------------------------------

export type MetricTask = {
  id: string;
  estimate: number;
  done: boolean;
  doneAt: Date | null;
  assigneeId: string | null;
  /** When the task entered this sprint */
  addedAt: Date;
  isBug: boolean;
  blocked: boolean;
};

export type BurndownPoint = { date: string; ideal: number; actual: number | null };

export type SprintMetrics = {
  committedHours: number;
  currentHours: number;
  doneHours: number;
  remainingHours: number;
  addedHours: number;
  removedHours: number;
  scopeChangePct: number;
  /** Done hours / committed hours (null before the sprint starts) */
  reliabilityPct: number | null;
  bugHours: number;
  bugRatioPct: number;
  burndown: BurndownPoint[];
  byMember: Record<string, { assigned: number; done: number }>;
  blockedTasks: number;
  openTasks: number;
};

export function computeSprintMetrics(args: {
  start: Date;
  end: Date;
  started: boolean;
  closed: boolean;
  today: Date;
  cal: WorkCalendar;
  tasks: MetricTask[];
  /** taskId -> hours at sprint start; empty before the sprint starts */
  committed: Record<string, number>;
}): SprintMetrics {
  const { start, end, started, closed, today, cal, tasks, committed } = args;
  const est = (t: MetricTask) => t.estimate;
  const currentHours = tasks.reduce((s, t) => s + est(t), 0);
  const doneHours = tasks.filter((t) => t.done).reduce((s, t) => s + est(t), 0);
  const committedHours = started ? Object.values(committed).reduce((a, b) => a + b, 0) : currentHours;

  let addedHours = 0;
  let removedHours = 0;
  if (started) {
    const present = new Set(tasks.map((t) => t.id));
    for (const t of tasks) {
      const snap = committed[t.id] ?? 0;
      addedHours += Math.max(0, est(t) - snap);
      removedHours += Math.max(0, snap - est(t));
    }
    for (const [id, hours] of Object.entries(committed)) if (!present.has(id)) removedHours += hours;
  }
  const scopeChangePct = committedHours > 0 ? ((addedHours + removedHours) / committedHours) * 100 : 0;
  const reliabilityPct = started && committedHours > 0 ? Math.min(100, (doneHours / committedHours) * 100) : null;
  const bugHours = tasks.filter((t) => t.isBug).reduce((s, t) => s + est(t), 0);
  const bugRatioPct = currentHours > 0 ? (bugHours / currentHours) * 100 : 0;

  // Burndown: hours of not-done tasks at the end of each day. Ideal falls over working days.
  const days = eachDay(start, end);
  const totalWorking = days.filter((d) => isWorkingDay(d, cal)).length;
  let workedSoFar = 0;
  const burndown: BurndownPoint[] = days.map((d) => {
    if (isWorkingDay(d, cal)) workedSoFar += 1;
    const ideal = totalWorking > 0 ? committedHours * (1 - workedSoFar / totalWorking) : 0;
    const dayEnd = d.getTime() + DAY_MS - 1;
    let actual: number | null = null;
    if (closed || d.getTime() <= today.getTime()) {
      actual = tasks
        .filter((t) => (committed[t.id] != null || t.addedAt.getTime() <= dayEnd) && !(t.done && t.doneAt && t.doneAt.getTime() <= dayEnd))
        .reduce((s, t) => s + est(t), 0);
    }
    return { date: toISODate(d), ideal: Math.round(ideal * 100) / 100, actual: actual == null ? null : Math.round(actual * 100) / 100 };
  });

  const byMember: SprintMetrics["byMember"] = {};
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const m = (byMember[t.assigneeId] ??= { assigned: 0, done: 0 });
    m.assigned += est(t);
    if (t.done) m.done += est(t);
  }

  return {
    committedHours: round2(committedHours),
    currentHours: round2(currentHours),
    doneHours: round2(doneHours),
    remainingHours: round2(currentHours - doneHours),
    addedHours: round2(addedHours),
    removedHours: round2(removedHours),
    scopeChangePct: round2(scopeChangePct),
    reliabilityPct: reliabilityPct == null ? null : round2(reliabilityPct),
    bugHours: round2(bugHours),
    bugRatioPct: round2(bugRatioPct),
    burndown,
    byMember: Object.fromEntries(Object.entries(byMember).map(([k, v]) => [k, { assigned: round2(v.assigned), done: round2(v.done) }])),
    blockedTasks: tasks.filter((t) => t.blocked && !t.done).length,
    openTasks: tasks.filter((t) => !t.done).length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sprint health score
// ---------------------------------------------------------------------------

export type HealthParts = { burndown: number; reliability: number; scope: number; load: number; blocked: number };
export type Health = { score: number; level: "green" | "amber" | "red"; parts: HealthParts };

export const HEALTH_WEIGHTS = { burndown: 0.3, reliability: 0.25, scope: 0.15, load: 0.15, blocked: 0.15 } as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function healthLevel(score: number): Health["level"] {
  return score >= 80 ? "green" : score >= 60 ? "amber" : "red";
}

export function sprintHealth(args: {
  committedHours: number;
  doneHours: number;
  remainingHours: number;
  /** Hours the ideal line says should remain today */
  idealRemaining: number;
  /** 0-1 share of the sprint's working days that have passed */
  elapsed: number;
  closed: boolean;
  scopeChangePct: number;
  overloadedMembers: number;
  members: number;
  blockedOrSlipped: number;
  openTasks: number;
}): Health {
  const a = args;
  const burndown = a.committedHours > 0 ? clamp01(1 - Math.max(0, a.remainingHours - a.idealRemaining) / a.committedHours) : 1;
  const reliability =
    a.committedHours <= 0 ? 1 : a.closed ? clamp01(a.doneHours / a.committedHours) : a.elapsed > 0 ? clamp01(a.doneHours / (a.committedHours * a.elapsed)) : 1;
  const scope = a.scopeChangePct <= 10 ? 1 : a.scopeChangePct >= 40 ? 0 : 1 - (a.scopeChangePct - 10) / 30;
  const load = a.members > 0 ? clamp01(1 - a.overloadedMembers / a.members) : 1;
  const blocked = a.openTasks > 0 ? clamp01(1 - a.blockedOrSlipped / a.openTasks) : 1;
  const score = Math.round(
    100 * (HEALTH_WEIGHTS.burndown * burndown + HEALTH_WEIGHTS.reliability * reliability + HEALTH_WEIGHTS.scope * scope + HEALTH_WEIGHTS.load * load + HEALTH_WEIGHTS.blocked * blocked),
  );
  return {
    score,
    level: healthLevel(score),
    parts: { burndown: pct(burndown), reliability: pct(reliability), scope: pct(scope), load: pct(load), blocked: pct(blocked) },
  };
}

const pct = (n: number) => Math.round(n * 100);

/** Share of the sprint's working days that have passed as of `today` (0-1). */
export function elapsedFraction(start: Date, end: Date, today: Date, cal: WorkCalendar): number {
  const days = eachDay(start, end).filter((d) => isWorkingDay(d, cal));
  if (days.length === 0) return 0;
  return days.filter((d) => d.getTime() <= today.getTime()).length / days.length;
}

/** Hours the ideal line says should remain on `today`. */
export function idealRemainingOn(burndown: BurndownPoint[], today: Date, committed: number): number {
  const iso = toISODate(today);
  if (burndown.length === 0) return committed;
  if (iso < burndown[0].date) return committed;
  const point = [...burndown].reverse().find((p) => p.date <= iso);
  return point ? point.ideal : 0;
}

// ---------------------------------------------------------------------------
// Velocity, forecast, cycle time
// ---------------------------------------------------------------------------

export function average(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/** Average of the last `n` values (most recent last). */
export function movingAverage(values: number[], n = 3): number | null {
  return average(values.slice(-n));
}

/**
 * Forecast the finish date: remaining hours at the average velocity per calendar day.
 * `velocities` are { doneHours, lengthDays } of recent closed sprints.
 */
export function forecastFinish(remainingHours: number, velocities: { doneHours: number; lengthDays: number }[], today: Date): Date | null {
  if (remainingHours <= 0) return today;
  const usable = velocities.filter((v) => v.lengthDays > 0);
  const totalDone = usable.reduce((s, v) => s + v.doneHours, 0);
  const totalDays = usable.reduce((s, v) => s + v.lengthDays, 0);
  if (totalDays === 0 || totalDone <= 0) return null;
  const perDay = totalDone / totalDays;
  return addDays(today, Math.ceil(remainingHours / perDay));
}

/** Days between the first time a status was reached and the last time DONE was reached. */
export function cycleTimeDays(
  events: { newValue: string | null; changedAt: Date }[],
  from: string,
  fallbackStart: Date,
  to = "DONE",
): number | null {
  const sorted = [...events].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  const done = [...sorted].reverse().find((e) => e.newValue === to);
  if (!done) return null;
  const started = sorted.find((e) => e.newValue === from && e.changedAt.getTime() <= done.changedAt.getTime());
  const t0 = (started?.changedAt ?? fallbackStart).getTime();
  return Math.max(0, Math.round(((done.changedAt.getTime() - t0) / DAY_MS) * 10) / 10);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
