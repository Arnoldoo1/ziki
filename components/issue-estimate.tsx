"use client";

import { useState, useTransition } from "react";
import { setIssueEstimateAction } from "@/app/actions/issues";
import { ISSUE_ESTIMATE_VALUES, formatIssueEstimate } from "@/lib/issue-estimate";
import { useToast } from "@/components/ui/toast";

export function IssueEstimate({ bugId, estimate }: { bugId: string; estimate: unknown }) {
  const [current, setCurrent] = useState(formatIssueEstimate(estimate));
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-zk-text-muted">Estimate</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = current;
          setCurrent(next);
          startTransition(async () => {
            const result = await setIssueEstimateAction(bugId, next === "" ? null : next);
            if (result.error || !result.ok) {
              setCurrent(prev);
              toast(result.error ?? "Failed to update estimate", "error");
            } else {
              toast("Estimate updated.");
            }
          });
        }}
        className="rounded-md border border-zk-border bg-zk-surface px-2 py-1 text-sm text-zk-text"
      >
        <option value="">None</option>
        {ISSUE_ESTIMATE_VALUES.map((v) => (
          <option key={v} value={v}>
            {v} pts
          </option>
        ))}
      </select>
    </label>
  );
}
