import type { Analytics, TaskView } from "./analytics";

export type TimelineFilters = { squad?: string; lob?: string; member?: string; sprint?: string; release?: string; only?: string };

export type OverloadRow = { sprintName: string; sprintId: string; memberId: string; name: string; assigned: number; capacity: number };

/** Tasks and overloaded members that match the timeline filters (shared by the page and the Excel export). */
export function filterTimeline(a: Analytics, f: TimelineFilters): { tasks: TaskView[]; overloadRows: OverloadRow[] } {
  const memberName = new Map(a.members.map((m) => [m.id, m.name]));
  const sprintRelease = new Map(a.sprints.map((s) => [s.id, s.releaseId]));
  const overloaded = new Set<string>();
  const overloadRows: OverloadRow[] = [];
  for (const s of a.sprints) {
    if (s.state === "CLOSED") continue;
    if ((f.squad && s.squadId !== f.squad) || (f.lob && s.lobId !== f.lob) || (f.sprint && s.id !== f.sprint)) continue;
    for (const [mid, v] of Object.entries(s.summary.byMember)) {
      const capacity = s.summary.capacityByMember[mid] ?? 0;
      if (v.assigned > capacity + 0.01) {
        overloaded.add(`${s.id}|${mid}`);
        overloadRows.push({ sprintName: s.name, sprintId: s.id, memberId: mid, name: memberName.get(mid) ?? "Removed member", assigned: v.assigned, capacity });
      }
    }
  }
  const tasks = a.tasks
    .filter((t) => (!f.squad || t.squadId === f.squad) && (!f.lob || t.lobId === f.lob) && (!f.sprint || t.sprintId === f.sprint))
    .filter((t) => !f.member || t.assigneeId === f.member)
    .filter((t) => !f.release || sprintRelease.get(t.sprintId) === f.release)
    .filter((t) => {
      if (f.only === "slipped") return t.slipped || t.issue != null;
      if (f.only === "overloaded") return t.assigneeId != null && overloaded.has(`${t.sprintId}|${t.assigneeId}`);
      return true;
    })
    .sort((x, y) => (x.assigneeName ?? "~").localeCompare(y.assigneeName ?? "~") || (x.plan?.start?.getTime() ?? Infinity) - (y.plan?.start?.getTime() ?? Infinity));
  return { tasks, overloadRows };
}
