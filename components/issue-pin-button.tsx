"use client";

import { useState, useTransition } from "react";
import { togglePinIssueAction } from "@/app/actions/issues";
import { useToast } from "@/components/ui/toast";

export function IssuePinButton({ bugId, isPinned }: { bugId: string; isPinned: boolean }) {
  const [pinned, setPinned] = useState(isPinned);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const prev = pinned;
        setPinned(!pinned);
        startTransition(async () => {
          const result = await togglePinIssueAction(bugId);
          if (result.error || !result.ok) {
            setPinned(prev);
            toast(result.error ?? "Failed to update pin", "error");
          } else {
            toast(result.isPinned ? "Issue pinned." : "Issue unpinned.");
          }
        });
      }}
      className="rounded-md border border-zk-border bg-zk-surface px-2 py-1 text-sm text-zk-text disabled:opacity-50"
      aria-pressed={pinned}
    >
      {pending ? "…" : pinned ? "📌 Pinned" : "Pin"}
    </button>
  );
}
