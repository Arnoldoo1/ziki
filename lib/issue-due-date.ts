/**
 * Issue due dates (#issue-due-dates): an optional target date for fixing an
 * issue. Stored as a date (no time). Helpers here are pure and safe to call
 * on either side of the server/client boundary.
 */

export function parseIssueDueDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

export function isOverdue(dueDate: Date | string | null | undefined, now: Date = new Date()): boolean {
  const d = parseIssueDueDate(dueDate);
  if (!d) return false;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.getTime() < today.getTime();
}

export function formatIssueDueDate(dueDate: Date | string | null | undefined): string {
  const d = parseIssueDueDate(dueDate);
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
