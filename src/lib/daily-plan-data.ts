import "server-only";
import { db } from "./db";
import { loadAnalytics } from "./analytics";
import { buildDailyPlan, workingColumns, type DoneTask } from "./daily-plan";
import { addDays, eachDay, todayUTC } from "./dates";
import { dateParam } from "./filters";
import { filterTimeline, type TimelineFilters } from "./timeline-filter";
import { itemKey } from "./work-items";

export type DailyFilters = Omit<TimelineFilters, "only"> & { from?: string; days?: string; all?: string; showOff?: string };

export const DAY_OPTIONS = [1, 3, 7, 14, 28];

/** Who works on which story and task each day, for the chosen filters and date range. */
export async function loadDailyPlan(f: DailyFilters) {
  const a = await loadAnalytics();
  const from = dateParam(f.from) ?? a.today ?? todayUTC();
  const n = DAY_OPTIONS.includes(Number(f.days)) ? Number(f.days) : 7;
  const allDays = eachDay(from, addDays(from, n - 1));
  const working = workingColumns(allDays, a.cal);
  const days = f.showOff || working.length === 0 ? allDays : working;

  const { tasks } = filterTimeline(a, { squad: f.squad, lob: f.lob, member: f.member, sprint: f.sprint, release: f.release });
  const done = await db.workItem.findMany({
    where: {
      type: "TASK",
      status: "DONE",
      assigneeId: f.member ? f.member : { not: null },
      doneAt: { gte: from, lt: addDays(allDays[allDays.length - 1], 1) },
      ...(f.lob ? { lobId: f.lob } : {}),
      ...(f.squad ? { lob: { squadId: f.squad } } : {}),
      ...(f.sprint ? { sprintId: f.sprint } : {}),
      ...(f.release ? { sprint: { releaseId: f.release } } : {}),
    },
    include: { lob: { select: { key: true } }, parent: { select: { id: true, number: true, title: true } }, sprint: { select: { name: true } } },
    orderBy: { doneAt: "asc" },
  });
  const doneTasks: DoneTask[] = done.map((t) => ({
    id: t.id,
    key: itemKey(t.lob.key, t.number),
    title: t.title,
    assigneeId: t.assigneeId!,
    doneAt: t.doneAt!,
    hours: t.estimateHours,
    storyId: t.parent?.id ?? null,
    storyKey: t.parent ? itemKey(t.lob.key, t.parent.number) : "",
    storyTitle: t.parent?.title ?? "",
    sprintName: t.sprint?.name ?? "",
  }));

  const members = a.members.filter((m) => m.active && (!f.squad || m.squadIds.includes(f.squad)) && (!f.member || m.id === f.member));
  const rows = buildDailyPlan({
    tasks,
    doneTasks,
    days,
    cal: a.cal,
    leaves: a.leaves,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    includeMembers: f.all ? members.map((m) => m.id) : undefined,
  });
  const pausedSprints = a.sprints.filter((s) => s.state === "PAUSED" && (!f.squad || s.squadId === f.squad) && (!f.lob || s.lobId === f.lob) && (!f.sprint || s.id === f.sprint));
  return { a, from, n, days, rows, pausedSprints };
}
