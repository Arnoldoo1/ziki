import { describe, expect, it } from "vitest";
import { epicProgress, isEpicChildDone, wouldCreateHierarchyCycle } from "@/lib/epics";

describe("issue epics", () => {
  it("counts only finished children as done", () => {
    expect(isEpicChildDone("resolved")).toBe(true);
    expect(isEpicChildDone("closed")).toBe(true);
    expect(isEpicChildDone("open")).toBe(false);
    expect(isEpicChildDone("in_progress")).toBe(false);
  });

  it("rolls up progress from children", () => {
    const progress = epicProgress([{ status: "resolved" }, { status: "open" }, { status: "closed" }]);
    expect(progress.total).toBe(3);
    expect(progress.done).toBe(2);
    expect(progress.percent).toBe(67);
    expect(epicProgress([]).percent).toBe(0);
  });

  it("detects a direct and indirect hierarchy cycle", async () => {
    // parent -> child would close a loop: child is already an ancestor of parent.
    const parents: Record<string, string | undefined> = { a: "b", b: "c" };
    const lookup = async (ids: string[]) => ids.map((id) => parents[id]).filter(Boolean) as string[];
    // nesting c under a: a's chain leads to c, so cycle.
    expect(await wouldCreateHierarchyCycle("c", "a", lookup)).toBe(true);
    // nesting d under a: no cycle.
    expect(await wouldCreateHierarchyCycle("d", "a", lookup)).toBe(false);
    // self-nesting.
    expect(await wouldCreateHierarchyCycle("a", "a", lookup)).toBe(true);
  });
});
