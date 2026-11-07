import { describe, expect, it } from "vitest";
import { parseIssueEstimate, formatIssueEstimate, ISSUE_ESTIMATE_VALUES } from "@/lib/issue-estimate";

describe("issue estimate", () => {
  it("accepts fibonacci values", () => {
    for (const v of ISSUE_ESTIMATE_VALUES) expect(parseIssueEstimate(v)).toBe(v);
    expect(parseIssueEstimate("5")).toBe(5);
    expect(parseIssueEstimate(4)).toBeNull();
    expect(parseIssueEstimate("x")).toBeNull();
    expect(parseIssueEstimate(null)).toBeNull();
  });

  it("formats", () => {
    expect(formatIssueEstimate(8)).toBe("8");
    expect(formatIssueEstimate(null)).toBe("");
  });
});
