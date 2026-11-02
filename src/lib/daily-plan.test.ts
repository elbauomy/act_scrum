import { describe, expect, it } from "vitest";
import { buildDailyPlan, offReason, workingColumns, type DoneTask } from "./daily-plan";
import { parseDate } from "./dates";
import type { TaskView } from "./analytics";

const d = parseDate;
const cal = { workingDays: [0, 1, 2, 3, 4], holidays: new Set(["2026-11-05"]) }; // Sun-Thu, holiday on Thursday 5th

function task(id: string, order: number, over: Partial<TaskView> & { byDay: Record<string, number> }): TaskView {
  const { byDay, ...rest } = over;
  return {
    id, key: `SON-${id}`, title: `Task ${id}`, status: "NEW", blocked: false, lobId: "l", lobName: "L", squadId: "s", squadName: "S", sprintId: "sp", sprintName: "Sprint 1",
    sprintStart: d("2026-11-01"), sprintEnd: d("2026-11-12"), storyId: "st1", storyKey: "SON-1", storyTitle: "Story one", assigneeId: "m1", assigneeName: "Anna", hours: 10,
    plan: { start: d("2026-11-02"), end: d("2026-11-03"), unscheduledHours: 0, byDay }, deadline: d("2026-11-12"), baselineEnd: null, slipped: false, issue: null, sprintPaused: false, order, ...rest,
  } as TaskView;
}

const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"].map(d);
const members = [{ id: "m1", name: "Anna" }, { id: "m2", name: "Ben" }];

describe("buildDailyPlan", () => {
  const tasks = [
    task("a", 0, { byDay: { "2026-11-02": 6, "2026-11-03": 4 } }),
    task("b", 1, { byDay: { "2026-11-03": 2 }, storyId: "st2", storyKey: "SON-2", storyTitle: "Story two", status: "IN_PROGRESS", blocked: true }),
    task("c", 2, { byDay: { "2026-11-03": 1.5 } }), // same story as a
  ];
  const done: DoneTask[] = [{ id: "z", key: "SON-9", title: "Finished one", assigneeId: "m1", doneAt: new Date("2026-11-02T09:00:00Z"), hours: 3, storyId: "st1", storyKey: "SON-1", storyTitle: "Story one", sprintName: "Sprint 1" }];
  const plan = buildDailyPlan({ tasks, doneTasks: done, days, cal, leaves: {}, members });

  it("lists each member's stories and tasks per day, grouped by story and in schedule order", () => {
    const anna = plan[0];
    expect(plan.map((p) => p.name)).toEqual(["Anna"]); // Ben has no work
    const tue = anna.days.find((c) => c.iso === "2026-11-03")!;
    expect(tue.stories.map((s) => [s.storyKey, s.items.map((i) => i.key)])).toEqual([["SON-1", ["SON-a", "SON-c"]], ["SON-2", ["SON-b"]]]);
    expect(tue.hours).toBe(7.5);
    expect(tue.stories[0].hours).toBe(5.5);
  });
  it("shows the work finished on a day, without counting it as planned hours", () => {
    const mon = plan[0].days.find((c) => c.iso === "2026-11-02")!;
    expect(mon.stories[0].items.map((i) => [i.key, i.done])).toEqual([["SON-9", true], ["SON-a", false]]);
    expect(mon.hours).toBe(6);
  });
  it("carries status and blocked flags", () => {
    const item = plan[0].days.find((c) => c.iso === "2026-11-03")!.stories[1].items[0];
    expect(item).toMatchObject({ status: "IN_PROGRESS", blocked: true, hours: 2, totalHours: 10 });
  });
  it("marks weekends, holidays and leave", () => {
    expect(offReason(d("2026-11-06"), cal)).toBe("weekend"); // Friday
    expect(offReason(d("2026-11-05"), cal)).toBe("holiday");
    expect(offReason(d("2026-11-03"), cal, [{ start: d("2026-11-03"), end: d("2026-11-03") }])).toBe("leave");
    expect(offReason(d("2026-11-02"), cal)).toBeNull();
    const withLeave = buildDailyPlan({ tasks, doneTasks: [], days, cal, leaves: { m1: [{ start: d("2026-11-03"), end: d("2026-11-03") }] }, members });
    expect(withLeave[0].days.find((c) => c.iso === "2026-11-03")!.off).toBe("leave");
  });
  it("can include members that have no work", () => {
    const all = buildDailyPlan({ tasks, doneTasks: [], days, cal, leaves: {}, members, includeMembers: ["m2"] });
    expect(all.map((p) => p.name)).toEqual(["Anna", "Ben"]);
    expect(all[1].taskCount).toBe(0);
  });
  it("drops weekend and holiday columns", () => {
    expect(workingColumns(days, cal).map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
  });
});
