"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { setEpicAction, addSubIssueAction, removeSubIssueAction } from "@/app/actions/epics";
import { epicProgress } from "@/lib/epics";
import { formatIssueNumber } from "@/lib/issue-number";
import { issuePath } from "@/lib/issue-ref";
import { statusLabel } from "@/lib/labels";
import type { ProjectRef } from "@/lib/project-paths";
import { useProjectRef } from "@/lib/use-project-ref";

export type EpicChildView = { id: string; number: number; title: string; status: string };
export type EpicParentView = { id: string; number: number; title: string } | null;

type Props = {
  projectSlug?: ProjectRef | null;
  bugId: string;
  canEdit: boolean;
  isEpic: boolean;
  parent: EpicParentView;
  subIssues: EpicChildView[];
};

export function EpicPanel({ projectSlug: propProjectSlug, bugId, canEdit, isEpic, parent, subIssues }: Props) {
  const router = useRouter();
  const currentProject = useProjectRef();
  const projectSlug = propProjectSlug ?? currentProject;
  const [error, setError] = useState<string | null>(null);
  const [childRef, setChildRef] = useState("");
  const [pending, startTransition] = useTransition();

  const progress = epicProgress(subIssues);

  const toggleEpic = () => {
    setError(null);
    startTransition(async () => {
      const result = await setEpicAction(bugId, !isEpic);
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  };

  const addSubIssue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const ref = childRef.trim();
    if (!ref) return;
    startTransition(async () => {
      const result = await addSubIssueAction(bugId, ref);
      if (result.error) { setError(result.error); return; }
      setChildRef("");
      router.refresh();
    });
  };

  const removeSubIssue = (childId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeSubIssueAction(bugId, childId);
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  };

  return (
    <section aria-label="Epic and sub-issues" data-testid="epic-panel" className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">Epic & sub-issues</h2>
        {canEdit ? (
          <button type="button" disabled={pending} onClick={toggleEpic} className="rounded-lg border border-zk-border px-2.5 py-1 text-xs font-semibold text-zk-text disabled:opacity-50">
            {isEpic ? "Unmark epic" : "Mark as epic"}
          </button>
        ) : null}
      </div>

      {parent ? (
        <p className="m-0 mt-2 text-sm text-zk-text2">
          Part of epic{" "}
          <Link href={projectSlug ? issuePath(projectSlug, parent.number) : `#${parent.number}`} className="font-semibold text-zk-accent hover:underline">
            {formatIssueNumber(parent.number)} · {parent.title}
          </Link>
        </p>
      ) : null}

      {isEpic || subIssues.length > 0 ? (
        <>
          {subIssues.length > 0 ? (
            <>
              <div className="mt-3 flex items-center gap-2 text-xs text-zk-muted">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zk-chip">
                  <div className="h-full rounded-full bg-zk-accent" style={{ width: `${progress.percent}%` }} />
                </div>
                <span className="tabular-nums">{progress.done}/{progress.total} done</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-zk-text2">
                {subIssues.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-zk-border/60 pb-2 last:border-b-0 last:pb-0">
                    <Link href={projectSlug ? issuePath(projectSlug, child.number) : `#${child.number}`} className="font-semibold text-zk-accent hover:underline">
                      {formatIssueNumber(child.number)} · {child.title}
                    </Link>
                    <span className="text-zk-muted">· {statusLabel[child.status as keyof typeof statusLabel] ?? child.status}</span>
                    {canEdit ? (
                      <button type="button" disabled={pending} onClick={() => removeSubIssue(child.id)} className="text-xs text-zk-muted underline hover:text-zk-text disabled:opacity-50">
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="m-0 mt-2 text-sm text-zk-muted">No sub-issues yet.</p>
          )}

          {canEdit ? (
            <form onSubmit={addSubIssue} className="mt-4 flex flex-wrap items-end gap-2 border-t border-zk-border pt-3">
              <label className="min-w-[12rem] flex-1 text-xs font-medium text-zk-muted">
                Add sub-issue
                <input
                  value={childRef}
                  onChange={(event) => setChildRef(event.target.value)}
                  placeholder="#12"
                  className="mt-1 block w-full rounded-lg border border-zk-border bg-zk-bg px-3 py-2 text-sm text-zk-text placeholder:text-zk-muted focus:outline-none focus:ring-2 focus:ring-zk-accent"
                />
              </label>
              <button type="submit" disabled={pending || !childRef.trim()} className="rounded-lg border border-zk-border px-3 py-2 text-sm font-semibold text-zk-text disabled:opacity-50">
                {pending ? "Adding…" : "Add"}
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <p className="m-0 mt-2 text-sm text-zk-muted">Mark this issue as an epic to group sub-issues under it.</p>
      )}

      {error ? <p role="alert" className="m-0 mt-2 text-sm text-zk-bad-fg">{error}</p> : null}
    </section>
  );
}
