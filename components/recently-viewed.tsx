"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clearRecentIssues, getRecentIssues, removeRecentIssue, type RecentIssue } from "@/lib/recently-viewed";

/**
 * Recently Viewed (#recently-viewed): a dropdown of issues the person has
 * recently opened, so they can jump back quickly. Stored in localStorage
 * only — no database, no migration. Self-hides on non-issues pages.
 */
export function RecentlyViewed() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentIssue[]>(() => getRecentIssues());

  const handleRemove = useCallback((id: string) => {
    removeRecentIssue(id);
    setRecent((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    clearRecentIssues();
    setRecent([]);
  }, []);

  // Only render on issues pages.
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname;
  if (!pathname.includes("/issues")) return null;

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-label="Recently viewed issues"
        aria-expanded={open}
        className="rounded-none text-[11px] px-2 py-1.5 border-x-0 border-zk-border"
      >
        ↻ Recent
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zk-border bg-zk-surface shadow-xl z-50">
          <div className="border-b border-zk-border px-3 py-2">
            <span className="text-[11px] font-semibold text-zk-muted">Recently viewed</span>
          </div>
          {recent.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-zk-muted">No recently viewed issues.</p>
          ) : (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {recent.map((issue) => (
                <li key={issue.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zk-surface-2">
                  <Link
                    href={`/${issue.org}/${issue.project}/${issue.number}`}
                    className="min-w-0 flex-1 truncate text-left text-xs text-zk-text hover:underline"
                  >
                    #{issue.number} {issue.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemove(issue.id)}
                    aria-label={`Remove ${issue.title}`}
                    className="text-xs text-zk-muted hover:text-red-500"
                  >
                    ×
                  </button>
                </li>
              ))}
              <li className="border-t border-zk-border">
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear recently viewed"
                  className="w-full text-left text-xs text-zk-accent underline py-1.5 px-2 hover:bg-zk-surface-2"
                >
                  Clear all
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
