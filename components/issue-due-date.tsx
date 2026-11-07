"use client";

import { useState, useTransition } from "react";
import { setIssueDueDateAction } from "@/app/actions/issues";
import { isOverdue, formatIssueDueDate } from "@/lib/issue-due-date";
import { useToast } from "@/components/ui/toast";

export function IssueDueDate({ bugId, dueDate }: { bugId: string; dueDate: unknown }) {
  const [current, setCurrent] = useState(formatIssueDueDate(dueDate as string | Date | null));
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const overdue = isOverdue(current || null);

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-zk-text-muted">Due date</span>
      <input
        type="date"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = current;
          setCurrent(next);
          startTransition(async () => {
            const result = await setIssueDueDateAction(bugId, next || null);
            if (result.error || !result.ok) {
              setCurrent(prev);
              toast(result.error ?? "Failed to update due date", "error");
            } else {
              toast("Due date updated.");
            }
          });
        }}
        className="rounded-md border border-zk-border bg-zk-surface px-2 py-1 text-sm text-zk-text"
      />
      {overdue ? <span className="text-xs font-medium text-red-600">Overdue</span> : null}
    </label>
  );
}
