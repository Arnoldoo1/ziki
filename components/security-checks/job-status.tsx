"use client";

import { useEffect, useState } from "react";

/**
 * Where a security-check job stands (#security-checks), for Your work: a live
 * countdown to its report while the agent checks, then reported or paid.
 * The minutes are worked out in the browser and refresh every 30 seconds.
 */
export function JobStatus({
  status,
  assignedAt,
  reportedAt,
  paid,
  reward,
  timeoutMinutes,
  size = "row",
}: {
  status: "checking" | "done" | "waiting" | "skipped";
  assignedAt: string | null;
  reportedAt: string | null;
  paid: boolean;
  reward: string;
  timeoutMinutes: number;
  size?: "row" | "card";
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const big = size === "card";

  if (status === "checking") {
    const start = assignedAt ? new Date(assignedAt).getTime() : null;
    const total = timeoutMinutes * 60_000;
    const used = start !== null && now !== null ? Math.min(1, Math.max(0, (now - start) / total)) : 0;
    const left = start !== null && now !== null ? Math.ceil((start + total - now) / 60_000) : null;
    const late = left !== null && left <= 0;
    return (
      <span className="flex w-full flex-col gap-1.5">
        <span className={`inline-flex items-center gap-2 font-semibold text-zk-text ${big ? "text-base" : "text-[13px]"}`}>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric-blue-strong opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-electric-blue-strong" />
          </span>
          Checking
        </span>
        <span aria-hidden="true" className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-zk-seg">
          <span className={`block h-full rounded-full ${late ? "bg-zk-bad-fg" : "bg-electric-blue-strong"}`} style={{ width: `${Math.max(4, used * 100)}%` }} />
        </span>
        <span className={`${big ? "text-sm" : "text-xs"} ${late ? "font-semibold text-zk-bad-fg" : "text-zk-muted"}`}>
          {left === null ? "Report due within the hour" : late ? "Report is late: it goes back to another agent" : `Report due in ${left} min`}
        </span>
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="flex flex-col gap-1">
        <span className={`inline-flex items-center gap-2 font-semibold ${paid ? "text-zk-ok-fg" : "text-zk-text"} ${big ? "text-base" : "text-[13px]"}`}>
          <span aria-hidden="true" className={`grid h-4 w-4 place-items-center rounded-full ${paid ? "bg-zk-ok-bg" : "bg-zk-chip"}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg>
          </span>
          {paid ? `${reward} paid to you` : "Reported"}
        </span>
        <span className={`${big ? "text-sm" : "text-xs"} text-zk-muted`}>
          {paid ? "In Your earnings" : reportedAt && now !== null ? `${ago(now - new Date(reportedAt).getTime())}, waiting to be paid` : "Waiting to be paid"}
        </span>
      </span>
    );
  }

  return <span className={`${big ? "text-sm" : "text-xs"} text-zk-muted`}>{status === "waiting" ? "Waiting for an agent" : "Skipped"}</span>;
}

function ago(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}
