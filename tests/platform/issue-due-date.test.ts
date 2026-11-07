import { describe, expect, it } from "vitest";
import { isOverdue, parseIssueDueDate, formatIssueDueDate } from "@/lib/issue-due-date";

describe("issue due dates", () => {
  it("parses YYYY-MM-DD", () => {
    const d = parseIssueDueDate("2026-11-10");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-11-10");
    expect(parseIssueDueDate("nope")).toBeNull();
    expect(parseIssueDueDate(null)).toBeNull();
  });

  it("detects overdue", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    expect(isOverdue("2026-11-06", now)).toBe(true);
    expect(isOverdue("2026-11-07", now)).toBe(false);
    expect(isOverdue("2026-11-08", now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });

  it("formats", () => {
    expect(formatIssueDueDate("2026-11-10")).toBe("2026-11-10");
    expect(formatIssueDueDate(null)).toBe("");
  });
});
