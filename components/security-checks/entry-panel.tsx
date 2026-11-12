import Link from "next/link";
import { CHECK_STATUS_LABEL, TARGET_KIND_LABEL } from "@/lib/security-checks";
import { nextStepPath, type WorkspaceCheckRow } from "@/lib/security-checks/entry";
import { LocalTime } from "@/components/local-time";
import { KindIcon } from "./entry-box";
import { CheckSiteButton } from "./entry-dialog";

const card = "rounded-[24px] border border-zk-border bg-zk-surface";
const ROW_BUTTON =
  "inline-flex h-9 items-center rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-semibold text-zk-text transition hover:border-zk-accent hover:text-zk-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";

function PrivacyNote({ className = "" }: { className?: string }) {
  return (
    <p className={`m-0 flex items-start gap-2 text-xs text-zk-muted ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      Agents only look. They never log in as you, change anything, or use what they find. Results stay private to you.
    </p>
  );
}

/**
 * What the Security page opens on (#security-checks, part 1). The box itself
 * waits behind "Check a site", so the page is just a line on what agents will
 * and won't do, and the workspace's checks. A workspace with none yet gets a
 * short empty state instead. The findings dashboard sits behind "Findings".
 */
export function SecurityChecksPanel({ checks, highlight }: { checks: WorkspaceCheckRow[]; highlight?: { checkId: string; paid: boolean } }) {
  return (
    <>
      {checks.length === 0 ? (
        <section aria-labelledby="security-empty-heading" className={`${card} grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center`}>
          <div className="min-w-0">
            <h2 id="security-empty-heading" className="m-0 text-2xl font-extrabold tracking-tight text-zk-text sm:text-3xl">
              Find the holes before someone else does
            </h2>
            <p className="mb-6 mt-2 max-w-xl text-base text-zk-text2">
              Ziki&apos;s agents check your website, servers or code and tell you privately what they find, with how to fix each one.
            </p>
            <CheckSiteButton id="security-target-empty" variant="large" />
            <PrivacyNote className="mt-6" />
          </div>
          <AgentsPicture />
        </section>
      ) : null}

      {checks.length ? (
        <section aria-labelledby="security-checks-heading" className={`${card} overflow-hidden`}>
          <div className="px-6 pb-4 pt-6">
            <h2 id="security-checks-heading" className="m-0 text-lg font-bold text-zk-text">Your checks</h2>
            <p className="m-0 mt-1 text-sm text-zk-text2">Newest first. Agents start once you&apos;ve shown a check is yours.</p>
          </div>
          {highlight?.paid ? (
            <p role="status" className="mx-6 mb-4 mt-0 rounded-[14px] border border-zk-border bg-zk-ok-bg px-3 py-2 text-sm text-zk-ok-fg">
              Paid. You&apos;ll see the full report, with how to fix each problem, once agents finish.
            </p>
          ) : null}
          <ul className="m-0 list-none divide-y divide-zk-border border-t border-zk-border p-0">
            {checks.map((check) => (
              <CheckRow key={check.id} check={check} highlighted={highlight?.checkId === check.id} />
            ))}
          </ul>
          <div className="border-t border-zk-border bg-zk-bg px-4 py-3 sm:px-6">
            <PrivacyNote />
          </div>
        </section>
      ) : null}
    </>
  );
}

function CheckRow({ check, highlighted }: { check: WorkspaceCheckRow; highlighted: boolean }) {
  const proving = check.status === "awaiting_ownership" && !check.verified;
  const payable = !check.paid && check.status !== "cancelled";
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6 ${highlighted ? "bg-zk-tint" : ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zk-border bg-zk-bg">
        <KindIcon kind={check.kind} className="text-zk-text2" />
      </span>
      <div className="min-w-[12rem] flex-1">
        <p className="m-0 truncate text-base font-bold text-zk-text">{check.value}</p>
        <p className="m-0 text-sm text-zk-text2">
          {TARGET_KIND_LABEL[check.kind]} · added <LocalTime date={check.createdAt} />
          {check.paid ? " · paid" : payable ? <> · <span className="tabular-nums">{check.priceCoins}</span> coins</> : null}
        </p>
      </div>
      <span className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusTone(check)}`}>{CHECK_STATUS_LABEL[check.status]}</span>
        {payable ? (
          <Link href={`/security/checks/${check.id}/pay`} className="text-sm font-semibold text-zk-accent hover:underline">Pay</Link>
        ) : null}
        {proving ? (
          <Link href={nextStepPath({ targetId: check.targetId, checkId: check.id, verified: false })} className={ROW_BUTTON}>Continue</Link>
        ) : (
          <Link href={`/security/checks/${check.id}`} className={ROW_BUTTON}>Open</Link>
        )}
      </span>
    </li>
  );
}

function statusTone(check: WorkspaceCheckRow): string {
  if (check.status === "awaiting_ownership") return "bg-zk-warn-bg text-zk-warn-fg";
  if (check.status === "done") return "bg-zk-ok-bg text-zk-ok-fg";
  if (check.status === "cancelled") return "bg-zk-chip text-zk-muted";
  return "bg-zk-tint text-zk-accent";
}

/** A picture of agents circling a shield. Decoration only, so screen readers skip it. */
function AgentsPicture() {
  const agents = [
    { label: "Web", x: 50, y: 11 },
    { label: "API", x: 82, y: 22 },
    { label: "Code", x: 18, y: 22 },
    { label: "Login", x: 16, y: 70 },
    { label: "Ports", x: 84, y: 70 },
  ];
  return (
    <div aria-hidden="true" className="relative hidden aspect-[6/5] overflow-hidden rounded-[22px] bg-[#0b1733] lg:block">
      {[92, 64, 36].map((size) => (
        <span
          key={size}
          className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          style={{ width: `${size}%`, aspectRatio: "1" }}
        />
      ))}
      <span className="absolute left-1/2 top-[48%] grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-electric-blue-strong text-white shadow-[0_0_40px_rgba(37,99,235,0.55)]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
      </span>
      {agents.map((agent) => (
        <span
          key={agent.label}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[#13254d] px-2.5 py-1 text-[11px] font-bold text-white/85"
          style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
        >
          {agent.label}
        </span>
      ))}
      <span className="absolute inset-x-5 bottom-4 flex justify-between text-xs text-white/70">
        <span>Ziki&apos;s agents</span>
        <span>Ready</span>
      </span>
    </div>
  );
}
