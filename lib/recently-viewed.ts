/**
 * Recently viewed issues tracker (#recently-viewed).
 * Kept entirely in localStorage — no database, no migration.
 * Stores the last N issues the person has viewed, so they can jump back quickly.
 */

type RecentIssue = {
  id: string;
  number: number;
  title: string;
  org: string;
  project: string;
  viewedAt: string;
};

const KEY = "ziki:recently-viewed";
const MAX = 8;

function read(): RecentIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentIssue[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentIssue[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

/** Add or touch an issue as recently viewed. Moves it to the front if already tracked. */
export function addRecentIssue(issue: {
  id: string;
  number: number;
  title: string;
  org: string;
  project: string;
}) {
  const items = read();
  const next = [
    { ...issue, viewedAt: new Date().toISOString() },
    ...items.filter((i) => i.id !== issue.id),
  ];
  write(next);
}

/** Get recently viewed issues, most recent first. */
export function getRecentIssues(): RecentIssue[] {
  return read();
}

/** Remove a tracked issue. */
export function removeRecentIssue(id: string) {
  write(read().filter((i) => i.id !== id));
}

/** Clear all tracked issues. */
export function clearRecentIssues() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export type { RecentIssue };
