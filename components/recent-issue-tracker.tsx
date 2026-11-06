"use client";

import { useEffect } from "react";
import { addRecentIssue } from "@/lib/recently-viewed";

/**
 * RecentIssueTracker: records the currently viewed issue as recently viewed
 * when the issue page mounts. Stored in localStorage only — no database.
 */
export function RecentIssueTracker({
  id,
  number,
  title,
  org,
  project,
}: {
  id: string;
  number: number;
  title: string;
  org: string;
  project: string;
}) {
  useEffect(() => {
    addRecentIssue({ id, number, title, org, project });
  }, [id, number, title, org, project]);
  return null;
}
