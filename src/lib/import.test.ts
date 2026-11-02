import { describe, expect, it } from "vitest";
import { planImport, type ImportContext } from "./import";

const ctx: ImportContext = {
  lobsByKey: new Map([["RB", { id: "lob1", squadId: "sq1" }]]),
  membersByName: new Map([["sara ali", [{ id: "m1", squadIds: new Set(["sq1"]) }]], ["omar", [{ id: "m2", squadIds: new Set(["sq2"]) }]]]),
  existingByKey: new Map([["RB-5", { id: "story5", type: "STORY", lobId: "lob1" }]]),
  existingByTitle: new Map(),
};
const row = (o: Record<string, string>) => ({ Type: "", "LOB Code": "RB", Title: "", Parent: "", Priority: "", Assignee: "", "Estimate (h)": "", Description: "", ...o });

describe("planImport", () => {
  it("links children to parents from earlier rows", () => {
    const plan = planImport(
      [row({ Type: "Epic", Title: "E" }), row({ Type: "Feature", Title: "F", Parent: "E" }), row({ Type: "User Story", Title: "S", Parent: "F" }), row({ Type: "Task", Title: "T", Parent: "S", Assignee: "Sara Ali", "Estimate (h)": "6" })],
      ctx,
    );
    expect(plan.errors).toEqual([]);
    expect(plan.items[1].parent).toEqual({ index: 0 });
    expect(plan.items[3]).toMatchObject({ assigneeId: "m1", estimate: 6, parent: { index: 2 } });
  });
  it("accepts existing IDs as parents", () => {
    const plan = planImport([row({ Type: "Task", Title: "T", Parent: "rb-5" })], ctx);
    expect(plan.errors).toEqual([]);
    expect(plan.items[0].parent).toEqual({ existingId: "story5" });
  });
  it("reports clear errors with spreadsheet row numbers", () => {
    const plan = planImport(
      [
        row({ Type: "Wizard", Title: "x" }),
        row({ Type: "Task", Title: "no parent" }),
        row({ Type: "Epic", Title: "" }),
        row({ Type: "Task", Title: "T", Parent: "RB-5", Assignee: "Omar" }),
        row({ Type: "Epic", Title: "E", Assignee: "Sara Ali" }),
        row({ Type: "Epic", Title: "E2", "LOB Code": "ZZ" }),
        row({ Type: "Task", Title: "T2", Parent: "RB-5", "Estimate (h)": "abc" }),
      ],
      ctx,
    );
    expect(plan.errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(plan.errors[0].message).toMatch(/Type must be/);
    expect(plan.errors[1].message).toMatch(/must be placed under/);
    expect(plan.errors[3].message).toMatch(/not a member of the squad/);
    expect(plan.errors[4].message).toMatch(/can only be set on tasks/);
    expect(plan.errors[5].message).toMatch(/no line of business/);
  });
  it("rejects wrong parent types and unknown parents", () => {
    const plan = planImport([row({ Type: "Epic", Title: "E" }), row({ Type: "Task", Title: "T", Parent: "E" }), row({ Type: "Feature", Title: "F", Parent: "Nope" })], ctx);
    expect(plan.errors.map((e) => e.row)).toEqual([3, 4]);
  });
});
