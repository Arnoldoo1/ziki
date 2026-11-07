/**
 * Issue estimate (#issue-estimate): an optional story-point size for an issue.
 */

export const ISSUE_ESTIMATE_VALUES = [1, 2, 3, 5, 8, 13] as const;
export type IssueEstimate = (typeof ISSUE_ESTIMATE_VALUES)[number];

export function isIssueEstimate(value: unknown): value is IssueEstimate {
  return typeof value === "number" && (ISSUE_ESTIMATE_VALUES as readonly number[]).includes(value);
}

export function parseIssueEstimate(value: unknown): IssueEstimate | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) return null;
  return isIssueEstimate(n) ? n : null;
}

export function normalizeIssueEstimate(value: unknown): IssueEstimate | null {
  return parseIssueEstimate(value);
}

export function formatIssueEstimate(value: unknown): string {
  const e = parseIssueEstimate(value);
  return e === null ? "" : String(e);
}
