import { describe, expect, it } from "vitest";
import { isPinned, pinnedFirst } from "@/lib/issue-pinning";

describe("issue pinning", () => {
  it("detects pinned", () => {
    expect(isPinned(true)).toBe(true);
    expect(isPinned(false)).toBe(false);
    expect(isPinned(null)).toBe(false);
  });

  it("sorts pinned first", () => {
    const items = [{ isPinned: false }, { isPinned: true }, { isPinned: false }];
    const sorted = [...items].sort((a, b) => pinnedFirst(a, b));
    expect(sorted[0].isPinned).toBe(true);
  });
});
