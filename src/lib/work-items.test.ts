import { describe, expect, it } from "vitest";
import { childTypesOf, LOB_KEY_PATTERN, nextRank, progressPercent, rollup, statusesFor, validateParent, type RollupNode } from "./work-items";

const task = (h: number | null, done = false): RollupNode => ({ type: "TASK", status: done ? "DONE" : "NEW", estimateHours: h, children: [] });

describe("hierarchy rules", () => {
  it("allows the agreed parent types", () => {
    expect(validateParent("EPIC", null)).toBeNull();
    expect(validateParent("FEATURE", "EPIC")).toBeNull();
    expect(validateParent("STORY", "FEATURE")).toBeNull();
    expect(validateParent("STORY", null)).toBeNull();
    expect(validateParent("BUG", null)).toBeNull();
    expect(validateParent("TASK", "BUG")).toBeNull();
  });
  it("rejects wrong or missing parents", () => {
    expect(validateParent("TASK", null)).toMatch(/must be placed under/);
    expect(validateParent("FEATURE", null)).toMatch(/must be placed under/);
    expect(validateParent("TASK", "EPIC")).toMatch(/cannot be placed under/);
    expect(validateParent("EPIC", "FEATURE")).toMatch(/cannot be placed under/);
  });
  it("lists child types", () => {
    expect(childTypesOf("EPIC")).toEqual(["FEATURE"]);
    expect(childTypesOf("FEATURE")).toEqual(["STORY", "BUG"]);
    expect(childTypesOf("STORY")).toEqual(["TASK"]);
    expect(childTypesOf("TASK")).toEqual([]);
  });
  it("uses the agreed workflows", () => {
    expect(statusesFor("STORY")).toEqual(["NEW", "APPROVED", "COMMITTED", "DONE"]);
    expect(statusesFor("TASK")).toEqual(["NEW", "IN_PROGRESS", "DONE"]);
    expect(statusesFor("EPIC")).toEqual([]);
  });
});

describe("rollup", () => {
  it("sums task hours and done hours up the tree", () => {
    const story: RollupNode = { type: "STORY", status: "COMMITTED", estimateHours: null, children: [task(4, true), task(6), task(null)] };
    const bug: RollupNode = { type: "BUG", status: "DONE", estimateHours: null, children: [task(2, true)] };
    const feature: RollupNode = { type: "FEATURE", status: "NEW", estimateHours: null, children: [story, bug] };
    const r = rollup(feature);
    expect(r).toEqual({ totalHours: 12, doneHours: 6, unestimatedTasks: 1, stories: 2, storiesDone: 1 });
    expect(progressPercent(r)).toBe(50);
  });
  it("falls back to story count when there are no hours", () => {
    const feature: RollupNode = {
      type: "FEATURE", status: "NEW", estimateHours: null,
      children: [{ type: "STORY", status: "DONE", estimateHours: null, children: [] }, { type: "STORY", status: "NEW", estimateHours: null, children: [] }],
    };
    expect(progressPercent(rollup(feature))).toBe(50);
    expect(progressPercent(rollup({ type: "EPIC", status: "NEW", estimateHours: null, children: [] }))).toBeNull();
  });
});

describe("misc", () => {
  it("validates LOB keys", () => {
    expect(LOB_KEY_PATTERN.test("RB")).toBe(true);
    expect(LOB_KEY_PATTERN.test("RETA2")).toBe(true);
    expect(LOB_KEY_PATTERN.test("R")).toBe(false);
    expect(LOB_KEY_PATTERN.test("2RB")).toBe(false);
    expect(LOB_KEY_PATTERN.test("TOOLONG1")).toBe(false);
  });
  it("ranks after the last sibling", () => {
    expect(nextRank([])).toBe(1);
    expect(nextRank([1, 5, 3])).toBe(6);
  });
});
