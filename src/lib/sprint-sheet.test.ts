import { describe, expect, it } from "vitest";
import {
  dateCandidates, parseCsv, parseSprintSheet, pickDateRange, planSprintImport, resolveLob, splitMemberHeader,
  type Grid, type PlanContext, type PlanItem,
} from "./sprint-sheet";

// A small sheet in the same layout as the Sonata planning sheet (names are made up).
function sheet(over: { title?: string; extraNada?: boolean } = {}): Grid {
  const g: Grid = [
    ["", over.title ?? "Sonata - Release 6 - Sprint 62", "From", "11/1/2026", "To", "11/12/2026", "10 Days"],
    ["", "Team Member", "Dev (1)\nAnna", "Dev (2)\nBen", "QC (1)\nCara", "", "", "Branch"],
    [" ", "", "100%", "100%", "50%"],
    ["Remaining Buffer", "", "58", "35", "24"],
    ["Initial buffer hours", "", "70", "70", "35"],
    ["Meetings", "(-) Sprint planning", "3", "3", "3"],
    ["", "(-) Retrospective", "1", "1", "1"],
    ["", "(-) Standups", "1.00", "1.00", "1.00"],
    ["", "(-) Sprint review", "2", "2", "2"],
    ["Special Leaves", "(-) Vacations (days)", "0", "2", "0"],
    ["", "(-) Excuses (hours)", "0", "0", "1"],
    ["Sprint Done Definition Tasks", "Update localization files", "0", "0", "0"],
    ["", "Integration Testing", "0", "0", "0"],
    ["Special Tasks", "Scrum master tasks", "0", "0", "0"],
    ["", "Awareness", "0", "0", "0"],
    ["Final Buffer", "", "63.00", "49.00", "27.00"],
    ["Final Score", "Total Points", "#REF!", "#REF!", "#REF!"],
    ["1", "Support"],
    ["Dev Team Tasks", "UI Task  "],
    ["", "Back End Task"],
    ["2", "Login page", "", "", "", "", "", "Auth-branch"],
    ["Dev Team Tasks", "UI Task  ", "4", "", ""],
    ["", "Back End Task", "", "6", ""],
    ["", "Test Execution", "", "", "3"],
    ["User story Done definition Tasks", "Code review", "1", "", ""],
    ["3", "Payments"],
    ["", "Back End Task", "", "8", ""],
    ["4", ""],
    ["", "UI Task"],
  ];
  if (over.extraNada) {
    g[1] = ["", "Team Member", "Dev (3)\nNada", "QC (2)\nNada", "", "", "", ""];
  }
  return g;
}

const lobs = [{ id: "lobS", name: "Sonata", key: "SON", squadId: "sq1", squadName: "Alpha" }];
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  lobs,
  members: [
    { id: "m1", name: "Anna", role: "Dev (1)", active: true, squadIds: ["sq1"] },
    { id: "m2", name: "Ben", role: "Dev (2)", active: true, squadIds: [] },
  ],
  releases: [{ id: "rel6", lobId: "lobS", name: "Release 6" }],
  sprints: [],
  items: [],
  workingDaysPerWeek: 5,
  calendarDays: 10,
  ...over,
});

describe("csv and dates", () => {
  it("reads quoted fields with line breaks", () => {
    expect(parseCsv('a,"b\nc",d\r\n"e ""q""",,f\n')).toEqual([["a", "b\nc", "d"], ['e "q"', "", "f"]]);
  });
  it("reads dates month-first, and day-first when the first number is above 12", () => {
    expect(dateCandidates("11/1/2026")).toEqual(["2026-11-01", "2026-01-11"]);
    expect(dateCandidates("25/12/2026")).toEqual(["2026-12-25"]);
    expect(dateCandidates("2026-11-05")).toEqual(["2026-11-05"]);
    expect(dateCandidates("5 Nov 2026")).toEqual(["2026-11-05"]);
    expect(dateCandidates("nonsense")).toEqual([]);
  });
  it("picks the range that fits the number of days", () => {
    expect(pickDateRange("11/1/2026", "11/12/2026", 10)).toEqual({ from: "2026-11-01", to: "2026-11-12" });
    expect(pickDateRange("25/12/2026", "5/1/2027", null)).toEqual({ from: "2026-12-25", to: "2027-01-05" });
    expect(pickDateRange("12/11/2026", "1/11/2026", null)).toBeNull(); // To is before From in every reading
    expect(pickDateRange("x", "y", null)).toBeNull();
  });
  it("splits member headers into role and name", () => {
    expect(splitMemberHeader("Dev (1)\nAnna")).toEqual({ role: "Dev (1)", name: "Anna" });
    expect(splitMemberHeader("Dina")).toEqual({ role: "", name: "Dina" });
    expect(splitMemberHeader("QC (3) Cara")).toEqual({ role: "QC (3)", name: "Cara" });
  });
});

describe("parseSprintSheet", () => {
  const p = parseSprintSheet(sheet());
  it("reads the title, dates and days", () => {
    expect(p.errors).toEqual([]);
    expect(p).toMatchObject({ sprintName: "Sprint 62", lobText: "Sonata", releaseText: "Release 6", from: "2026-11-01", to: "2026-11-12", days: 10 });
  });
  it("reads the members from the header row only", () => {
    expect(p.members.map((m) => [m.name, m.role])).toEqual([["Anna", "Dev (1)"], ["Ben", "Dev (2)"], ["Cara", "QC (1)"]]);
  });
  it("reads each member's capacity rows", () => {
    expect(p.capacity[2]).toMatchObject({ availabilityPct: 100, initialHours: 70, meetingsHours: 7, vacationDays: 0, sheetFinal: 63 });
    expect(p.capacity[3]).toMatchObject({ vacationDays: 2, sheetFinal: 49 });
    expect(p.capacity[4]).toMatchObject({ availabilityPct: 50, initialHours: 35, excuseHours: 1, sheetFinal: 27 });
  });
  it("reads stories, their task hours per member, and the extra columns", () => {
    expect(p.stories.map((s) => s.title)).toEqual(["Support", "Login page", "Payments", ""]);
    const login = p.stories[1];
    expect(login.attributes).toEqual({ Branch: "Auth-branch" });
    expect(login.tasks.map((t) => [t.taskType, t.col, t.hours])).toEqual([["UI Task", 2, 4], ["Back End Task", 3, 6], ["Test Execution", 4, 3], ["Code review", 2, 1]]);
  });
  it("reports a sheet that is not a planning sheet", () => {
    expect(parseSprintSheet([["a", "b"]]).errors.length).toBeGreaterThan(0);
  });
  it("warns about text in an hours cell", () => {
    const g = sheet();
    g[21][2] = "x";
    expect(parseSprintSheet(g).warnings.join(" ")).toMatch(/not a number of hours/);
  });
});

describe("planSprintImport", () => {
  it("plans a new sprint with new and existing members", () => {
    const plan = planSprintImport(parseSprintSheet(sheet()), ctx());
    expect(plan.errors).toEqual([]);
    const ops = plan.ops!;
    expect(ops.sprint).toMatchObject({ existingId: null, name: "Sprint 62", startDate: "2026-11-01", endDate: "2026-11-12", releaseId: "rel6" });
    expect(ops.newMembers).toEqual([{ name: "Cara", role: "QC (1)" }]);
    // Ben exists but is not in the squad: added with 70h / 10 days x 5 days per week
    expect(ops.memberships).toEqual([
      { member: { existingId: "m2" }, weeklyHours: 35 },
      { member: { newIndex: 0 }, weeklyHours: 17.5 },
    ]);
    expect(ops.plans.map((x) => x.capacityHours)).toEqual([63, 49, 27]);
    expect(ops.plans[1].vacationHours).toBe(14);
    expect(ops.newStories).toEqual([{ title: "Login page", description: "Branch: Auth-branch" }, { title: "Payments", description: "" }]);
    expect(ops.newTasks).toHaveLength(5);
    expect(plan.preview!.skipped).toEqual(["Support"]);
    expect(plan.preview!.totals).toMatchObject({ stories: 2, newStories: 2, tasks: 5, newTasks: 5, hours: 22, newMembers: 1, addedToSquad: 1 });
    const anna = plan.preview!.members[0];
    expect(anna).toMatchObject({ status: "matched", capacity: 63, assigned: 5, remaining: 58 });
    expect(plan.preview!.members[1].status).toBe("added-to-squad");
    expect(plan.preview!.members[2].status).toBe("new");
  });

  it("re-uses existing stories and tasks and updates changed hours", () => {
    const items: PlanItem[] = [
      { id: "s2", type: "STORY", title: "payments ", status: "NEW", sprintId: null, parentId: null, assigneeId: null, estimateHours: null, rank: 1 },
      { id: "t1", type: "TASK", title: "Back End Task", status: "NEW", sprintId: null, parentId: "s2", assigneeId: "m2", estimateHours: 5, rank: 1 },
    ];
    const plan = planSprintImport(parseSprintSheet(sheet()), ctx({ items }));
    const ops = plan.ops!;
    expect(ops.newStories.map((s) => s.title)).toEqual(["Login page"]);
    expect(ops.moveStories).toEqual([{ id: "s2" }]);
    expect(ops.updateTasks).toEqual([{ id: "t1", hours: 8, oldHours: 5 }]);
    expect(ops.newTasks).toHaveLength(4);
  });

  it("leaves unchanged tasks alone and skips stories that are Done", () => {
    const sprints = [{ id: "sp", lobId: "lobS", name: "Sprint 62", state: "PLANNED" as const, releaseId: null }];
    const items: PlanItem[] = [
      { id: "s2", type: "STORY", title: "Payments", status: "NEW", sprintId: "sp", parentId: null, assigneeId: null, estimateHours: null, rank: 1 },
      { id: "t1", type: "TASK", title: "Back End Task", status: "NEW", sprintId: "sp", parentId: "s2", assigneeId: "m2", estimateHours: 8, rank: 1 },
      { id: "s1", type: "STORY", title: "Login page", status: "DONE", sprintId: null, parentId: null, assigneeId: null, estimateHours: null, rank: 2 },
    ];
    const plan = planSprintImport(parseSprintSheet(sheet()), ctx({ sprints, items }));
    expect(plan.ops!.sprint.existingId).toBe("sp");
    expect(plan.ops!.moveStories).toEqual([]);
    expect(plan.ops!.updateTasks).toEqual([]);
    expect(plan.ops!.newTasks).toEqual([]);
    expect(plan.warnings.join(" ")).toMatch(/already exists and is Done/);
  });

  it("refuses a closed sprint", () => {
    const sprints = [{ id: "sp", lobId: "lobS", name: "Sprint 62", state: "CLOSED" as const, releaseId: null }];
    const plan = planSprintImport(parseSprintSheet(sheet()), ctx({ sprints }));
    expect(plan.ops).toBeNull();
    expect(plan.errors.join(" ")).toMatch(/already closed/);
  });

  it("needs a line of business that can be found", () => {
    expect(planSprintImport(parseSprintSheet(sheet({ title: "Unknown - Release 1 - Sprint 5" })), ctx()).errors.join(" ")).toMatch(/Choose one in the form/);
    const forced = planSprintImport(parseSprintSheet(sheet({ title: "Unknown - Release 1 - Sprint 5" })), ctx({ lobOverrideId: "lobS" }));
    expect(forced.errors).toEqual([]);
    expect(resolveLob(parseSprintSheet(sheet()), lobs).lob?.id).toBe("lobS");
  });

  it("warns when the release or the working days do not match", () => {
    const plan = planSprintImport(parseSprintSheet(sheet()), ctx({ releases: [], calendarDays: 9 }));
    const w = plan.warnings.join(" ");
    expect(w).toMatch(/Release "Release 6" was not found/);
    expect(w).toMatch(/Settings .* give 9 working days/);
    expect(plan.ops!.sprint.releaseId).toBeNull();
  });

  it("tells two members with the same name apart by role", () => {
    const members = [
      { id: "n1", name: "Nada", role: "Dev (3)", active: true, squadIds: ["sq1"] },
      { id: "n2", name: "Nada", role: "QC (2)", active: true, squadIds: ["sq1"] },
    ];
    const g = sheet({ extraNada: true });
    const ok = planSprintImport(parseSprintSheet(g), ctx({ members }));
    expect(ok.errors).toEqual([]);
    expect(ok.preview!.members.map((m) => m.status)).toEqual(["matched", "matched"]);
    expect(ok.ops!.plans.map((p) => (p.member as { existingId: string }).existingId)).toEqual(["n1", "n2"]);
    // same role twice: cannot tell them apart
    const same = planSprintImport(parseSprintSheet(g), ctx({ members: members.map((m) => ({ ...m, role: "Dev" })) }));
    expect(same.errors.join(" ")).toMatch(/More than one member is named "Nada"/);
  });

  it("warns when a member is assigned more than their capacity", () => {
    const g = sheet();
    g[22][3] = "60";
    expect(planSprintImport(parseSprintSheet(g), ctx()).warnings.join(" ")).toMatch(/Ben is assigned 68h but has only 49h/);
  });
});
