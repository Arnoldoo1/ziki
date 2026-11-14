"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TARGET_KIND_LABEL } from "@/lib/security-checks";
import type { ScanStage, WorkspaceCheckRow } from "@/lib/security-checks/entry";
import { LocalTime } from "@/components/local-time";
import { removeScan } from "@/app/actions/security-assistant";
import { ToolbarFilterMenu } from "@/components/toolbar-filter-menu";
import { PaginationControls } from "@/components/pagination-controls";
import { KindIcon } from "./entry-box";
import { PreviewResult } from "./preview-result";

const PRIMARY_BUTTON =
  "inline-flex h-9 items-center rounded-full bg-electric-blue-strong px-4 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";
const BUTTON =
  "inline-flex h-9 items-center rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-semibold text-zk-text transition hover:border-zk-accent hover:text-zk-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";

/** Cards on each page. */
const PAGE = 10;

const STAGE: Record<ScanStage, { label: string; tone: string }> = {
  scanning: { label: "Scanning", tone: "bg-zk-tint text-zk-accent" },
  report: { label: "Report ready", tone: "bg-zk-ok-bg text-zk-ok-fg" },
  in_app: { label: "In your app", tone: "bg-zk-chip text-zk-text" },
  cancelled: { label: "Cancelled", tone: "bg-zk-chip text-zk-muted" },
};

const SEVERITY_DOT: Record<"critical" | "high" | "medium" | "low", string> = {
  critical: "bg-[#be123c]",
  high: "bg-[#dc2626]",
  medium: "bg-[#ea580c]",
  low: "bg-zk-muted",
};

type Filter = "all" | "scanning" | "report" | "in_app";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scanning", label: "Scanning" },
  { id: "report", label: "Report ready" },
  { id: "in_app", label: "In your app" },
];

/** Where a scan is: the same rule as scanStage in lib/security-checks/entry.ts, kept here so this client file needs no server code. */
function stageOf(check: Pick<WorkspaceCheckRow, "status" | "posted" | "moved">): ScanStage {
  if (check.status === "cancelled") return "cancelled";
  if (check.moved > 0) return "in_app";
  return check.posted ? "report" : "scanning";
}

/**
 * The person's scans (#security-checks): the app's Filter menu (by stage, with
 * counts), a search by site, and ten cards a page with the app's numbered
 * pages, so a long list stays easy to use. Cards, not the issue table, and no sidebar (Mark's rules).
 */
export function ScanList({ checks, highlightId, show = "all", page = 1 }: { checks: WorkspaceCheckRow[]; highlightId?: string; show?: string; page?: number }) {
  const filter: Filter = FILTERS.some(({ id }) => id === show) ? (show as Filter) : "all";
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const searchBox = useRef<HTMLInputElement>(null);
  // Opening the search puts the cursor in it.
  useEffect(() => {
    if (searching) searchBox.current?.focus();
  }, [searching]);
  // Removed scans (cancelled) leave the list.
  const live = useMemo(() => checks.filter((check) => check.status !== "cancelled"), [checks]);
  const count = (id: Filter) => (id === "all" ? live.length : live.filter((check) => stageOf(check) === id).length);
  const words = query.trim().toLowerCase();
  const matching = live.filter((check) => (filter === "all" || stageOf(check) === filter) && (!words || check.value.toLowerCase().includes(words)));
  // Numbered pages like the app's issue lists; a search looks through every page.
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE));
  const current = words ? 1 : Math.min(Math.max(1, page), totalPages);
  const visible = words ? matching : matching.slice((current - 1) * PAGE, current * PAGE);

  return (
    <div className="flex flex-col gap-4">
      {/* A toolbar like the app's issue lists: what this is on the left, Filter and search on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="security-scans-heading" className="m-0 text-base font-bold text-zk-text">
          Your scans <span className="font-normal tabular-nums text-zk-muted">{live.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {searching ? (
            <input
              ref={searchBox}
              type="search"
              aria-label="Search your scans"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onBlur={() => {
                if (!query.trim()) setSearching(false);
              }}
              placeholder="Search by site"
              className="h-8 w-48 rounded-lg border border-zk-border bg-zk-surface px-3 text-[13px] text-zk-text placeholder:text-zk-muted focus:border-electric-blue-strong/60 focus:outline-none sm:w-60"
            />
          ) : null}
          <ToolbarFilterMenu
            summary={filter === "all" ? "" : FILTERS.find(({ id }) => id === filter)?.label}
            groups={[
              {
                options: FILTERS.map(({ id, label }) => ({
                  label,
                  count: count(id),
                  href: id === "all" ? "/security" : `/security?show=${id}`,
                  selected: filter === id,
                })),
              },
            ]}
          />
          <button
            type="button"
            aria-label="Search your scans"
            aria-pressed={searching}
            onClick={() => setSearching((open) => !open)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-zk-border bg-zk-surface text-zk-text2 hover:bg-zk-chip hover:text-zk-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        </div>
      </div>

      {visible.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {visible.map((check) => (
            <ScanCard key={check.id} check={check} highlighted={highlightId === check.id} />
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-2xl border border-dashed border-zk-border px-4 py-8 text-center text-sm text-zk-muted">
          {words ? `No scans match "${query.trim()}".` : "No scans here yet."}
        </p>
      )}

      {matching.length && !words ? (
        <PaginationControls
          page={current}
          totalPages={totalPages}
          totalCount={matching.length}
          from={(current - 1) * PAGE + 1}
          to={Math.min(current * PAGE, matching.length)}
          basePath="/security"
          queryParams={{ show: filter === "all" ? undefined : filter }}
          itemLabel="scan"
        />
      ) : null}
    </div>
  );
}

/** One scan: what it is, where it is, what was found, and the one next click. */
function ScanCard({ check, highlighted }: { check: WorkspaceCheckRow; highlighted: boolean }) {
  const stage = stageOf(check);
  // Removing asks first, on the card itself, under its header.
  const [removing, setRemoving] = useState(false);
  const reportHref = `/security/checks/${check.id}`;
  const payHref = `/security/checks/${check.id}/pay`;
  const canUnlock = check.posted && check.unlocked < check.findings;
  const quick = check.preview;
  const counts = quick ? (["critical", "high", "medium", "low"] as const).filter((severity) => quick.counts[severity] > 0) : [];

  const status = check.posted
    ? check.findings === 0
      ? "Report ready: nothing to fix."
      : `Report ready: ${check.findings} ${check.findings === 1 ? "finding" : "findings"}${check.unlocked ? `, ${check.unlocked} unlocked` : ""}.`
    : "Agents are checking it now.";

  return (
    <li className={`flex flex-col rounded-2xl border bg-zk-surface transition hover:border-zk-accent/50 hover:shadow-sm ${highlighted ? "border-zk-accent ring-2 ring-zk-accent/20" : "border-zk-border"}`}>
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zk-border bg-zk-bg">
          <KindIcon kind={check.kind} className="text-zk-text2" />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={reportHref} className="block truncate text-base font-bold text-zk-text hover:text-zk-accent">{check.value}</Link>
          <p className="m-0 text-[13px] text-zk-muted">
            {TARGET_KIND_LABEL[check.kind]} · <LocalTime date={check.createdAt} />
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${STAGE[stage].tone}`}>
          {stage === "scanning" ? <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
          {STAGE[stage].label}
        </span>
        {/* Remove: a small, quiet icon, only while the report isn't posted (reports never go away). */}
        {!check.posted ? (
          <button
            type="button"
            onClick={() => setRemoving(true)}
            aria-label={`Remove ${check.value}`}
            title="Remove"
            className="-mr-1 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-zk-muted transition hover:bg-zk-chip hover:text-zk-bad-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
          </button>
        ) : null}
      </div>
      {removing ? <RemoveConfirm checkId={check.id} site={check.value} onKeep={() => setRemoving(false)} /> : null}

      {/* The quick scan from when it was added: its counts at a glance, and the whole result one click away. */}
      {quick ? (
        <details className="group mx-4 rounded-xl bg-zk-bg">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-[13px] text-zk-text2 [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zk-muted">Quick scan</span>
            {quick.total ? (
              counts.map((severity) => (
                <span key={severity} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${SEVERITY_DOT[severity]}`} />
                  <span className="font-semibold tabular-nums text-zk-text">{quick.counts[severity]}</span> {severity}
                </span>
              ))
            ) : (
              <span className="text-zk-ok-fg">✓ Nothing found</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-zk-accent">
              <span className="group-open:hidden">See result</span>
              <span className="hidden group-open:inline">Hide result</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition group-open:rotate-180"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </summary>
          <div className="px-2 pb-2 sm:px-3 sm:pb-3">
            <PreviewResult summary={quick} />
          </div>
        </details>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="m-0 min-w-0 flex-1 text-[13px] text-zk-text2">
          {status}
          {check.moved ? ` ${check.moved} moved to your app.` : ""}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canUnlock ? (
            <>
              <Link href={reportHref} className={BUTTON}>Open report</Link>
              <Link href={payHref} className={PRIMARY_BUTTON}>Unlock fixes</Link>
            </>
          ) : (
            <Link href={reportHref} className={check.posted ? PRIMARY_BUTTON : BUTTON}>
              {check.posted ? "Open report" : "See progress"}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

/** Remove a scan whose report isn't posted yet, after a yes on the card itself. */
function RemoveConfirm({ checkId, site, onKeep }: { checkId: string; site: string; onKeep: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={`Remove ${site}?`} className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zk-border bg-zk-bg px-3 py-2 text-[13px] text-zk-text2">
      <span className="min-w-0 flex-1">{error ?? `Remove ${site} from your scans? Agents stop checking it.`}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const answer = await removeScan(checkId);
            if (answer.ok) router.refresh();
            else setError(answer.error);
          })
        }
        className="inline-flex h-8 items-center rounded-full bg-zk-bad-fg px-3 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      <button type="button" onClick={onKeep} className="inline-flex h-8 items-center rounded-full border border-zk-border bg-zk-surface px-3 text-[13px] font-semibold text-zk-text">
        Keep
      </button>
    </div>
  );
}
