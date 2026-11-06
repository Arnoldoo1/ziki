/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addRecentIssue,
  clearRecentIssues,
  getRecentIssues,
  removeRecentIssue,
} from "./recently-viewed";

beforeEach(() => {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
});
afterEach(() => {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
});

describe("recently-viewed", () => {
  it("returns empty when nothing stored", () => {
    expect(getRecentIssues()).toEqual([]);
  });

  it("adds and retrieves an issue", () => {
    addRecentIssue({
      id: "bug_1",
      number: 42,
      title: "Login button overlaps",
      org: "zedu",
      project: "desktop",
    });
    const items = getRecentIssues();
    expect(items).toHaveLength(1);
    expect(items[0].number).toBe(42);
    expect(items[0].title).toBe("Login button overlaps");
  });

  it("moves existing issue to front on re-view", () => {
    addRecentIssue({ id: "a", number: 1, title: "First", org: "o", project: "p" });
    addRecentIssue({ id: "b", number: 2, title: "Second", org: "o", project: "p" });
    addRecentIssue({ id: "a", number: 1, title: "First updated", org: "o", project: "p" });
    const items = getRecentIssues();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("a");
    expect(items[0].title).toBe("First updated");
    expect(items[1].id).toBe("b");
  });

  it("respects max limit", () => {
    for (let i = 1; i <= 10; i++) {
      addRecentIssue({ id: `bug_${i}`, number: i, title: `Issue ${i}`, org: "o", project: "p" });
    }
    const items = getRecentIssues();
    expect(items).toHaveLength(8);
    expect(items[0].number).toBe(10);
    expect(items[7].number).toBe(3);
  });

  it("removes an issue", () => {
    addRecentIssue({ id: "a", number: 1, title: "First", org: "o", project: "p" });
    addRecentIssue({ id: "b", number: 2, title: "Second", org: "o", project: "p" });
    removeRecentIssue("a");
    const items = getRecentIssues();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("b");
  });

  it("clears all issues", () => {
    addRecentIssue({ id: "a", number: 1, title: "First", org: "o", project: "p" });
    clearRecentIssues();
    expect(getRecentIssues()).toEqual([]);
  });
});