import Link from "next/link";
import { CHECK_STATUS_LABEL, TARGET_KIND_LABEL } from "@/lib/security-checks";
import { nextStepPath, type WorkspaceCheckRow } from "@/lib/security-checks/entry";
import { LocalTime } from "@/components/local-time";
import { KindIcon } from "./entry-box";
import { CheckSiteButton } from "./entry-dialog";
import { ExampleReport } from "./example-report";

const card = "rounded-[24px] border border-zk-border bg-zk-surface";
const PRIMARY_ROW_BUTTON =
  "inline-flex h-9 items-center rounded-full bg-electric-blue-strong px-4 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";
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
 * What the Security page opens on (#security-checks, part 1). The box waits
 * behind "Check a site" and opens in a pop-up. A workspace with no checks yet
 * sees a short card; a returning one sees its checks. The findings dashboard
 * sits behind the "Findings" link.
 */
export function SecurityChecksPanel({ checks, highlight }: { checks: WorkspaceCheckRow[]; highlight?: { checkId: string; paid: boolean; added?: boolean } }) {
  return (
    <>
      {checks.length === 0 ? <FirstCheck /> : null}

      {checks.length ? (
        <section aria-labelledby="security-checks-heading" className={`${card} overflow-hidden`}>
          <div className="px-4 pb-4 pt-6 sm:px-6">
            <div className="min-w-0">
              <h2 id="security-checks-heading" className="m-0 text-lg font-bold text-zk-text">Your checks</h2>
              <p className="m-0 mt-1 text-sm text-zk-text2">Newest first. Agents start once you&apos;ve shown a check is yours.</p>
            </div>
          </div>
          {highlight?.added && !highlight.paid ? (
            <p role="status" className="mx-4 mb-4 mt-0 rounded-[14px] border border-zk-border bg-zk-ok-bg px-3 py-2 text-sm text-zk-ok-fg sm:mx-6">
              Saved. Next, you show it&apos;s yours, then agents can start. You can pay now or later.
            </p>
          ) : null}
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
  const cancelled = check.status === "cancelled";
  const proving = check.status === "awaiting_ownership" && !check.verified;
  const payable = !check.paid && !cancelled;
  const payHref = `/security/checks/${check.id}/pay`;
  const running = !proving && !cancelled;

  return (
    <li className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 ${highlighted ? "bg-zk-tint" : ""}`}>
      <div className="flex min-w-[14rem] flex-1 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zk-border bg-zk-bg">
          <KindIcon kind={check.kind} className="text-zk-text2" />
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate text-base font-bold text-zk-text">{check.value}</p>
          <p className="m-0 text-sm text-zk-muted">
            {TARGET_KIND_LABEL[check.kind]} · added <LocalTime date={check.createdAt} />
          </p>
        </div>
      </div>

      {cancelled ? (
        <span className="inline-flex rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-bold text-zk-muted">{CHECK_STATUS_LABEL[check.status]}</span>
      ) : (
        <ol aria-label={`Steps for ${check.value}`} className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-[13px]">
          <Step state={proving ? "now" : "done"}>Show it&apos;s yours</Step>
          <StepLine />
          <Step state={check.paid ? "done" : !proving ? "now" : "later"}>
            {check.paid ? "Paid" : (
              <Link href={payHref} className="hover:underline">
                Pay <span className="tabular-nums">{check.priceCoins}</span> coins
              </Link>
            )}
          </Step>
          <StepLine />
          <Step state={check.status === "done" ? "done" : running && check.paid ? "now" : "later"}>
            {running ? CHECK_STATUS_LABEL[check.status] : "Agents check"}
          </Step>
        </ol>
      )}

      <div className="flex shrink-0 items-center">
        {proving ? (
          <Link href={nextStepPath({ targetId: check.targetId, checkId: check.id, verified: false })} className={PRIMARY_ROW_BUTTON}>
            Continue
          </Link>
        ) : payable ? (
          <Link href={payHref} className={PRIMARY_ROW_BUTTON}>Pay</Link>
        ) : (
          <Link href={`/security/checks/${check.id}`} className={ROW_BUTTON}>Open</Link>
        )}
      </div>
    </li>
  );
}

/** One step of a check: done (a tick), now (the step to do next) or later. */
function Step({ state, children }: { state: "done" | "now" | "later"; children: React.ReactNode }) {
  const tone = state === "done" ? "text-zk-ok-fg" : state === "now" ? "font-semibold text-zk-text" : "text-zk-muted";
  return (
    <li aria-current={state === "now" ? "step" : undefined} className={`inline-flex items-center gap-1.5 whitespace-nowrap ${tone}`}>
      {state === "done" ? (
        <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-zk-ok-bg">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg>
        </span>
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${state === "now" ? "bg-electric-blue-strong ring-4 ring-electric-blue-strong/15" : "border border-zk-border bg-zk-surface"}`} />
      )}
      {state === "done" ? <span className="sr-only">Done: </span> : null}
      {children}
    </li>
  );
}

function StepLine() {
  return <li aria-hidden="true" className="h-px w-3 bg-zk-border sm:w-6" />;
}

/**
 * What a workspace sees before it has checked anything: what Ziki does, one
 * button, a small example of the report, and the three steps.
 */
function FirstCheck() {
  return (
    <>
      <section aria-labelledby="security-empty-heading" className={`${card} overflow-hidden`}>
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zk-tint px-3 py-1 text-xs font-bold text-zk-accent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /></svg>
              Security checks
            </span>
            <h2 id="security-empty-heading" className="mb-0 mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-zk-text sm:text-[40px]">
              Find the holes before someone else does
            </h2>
            <p className="mb-0 mt-4 max-w-lg text-base leading-relaxed text-zk-text2">
              Ziki&apos;s agents check your website, server or code for weaknesses, then tell you privately what they found and how to fix each one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <CheckSiteButton id="security-target-empty" variant="large" />
              <span className="text-sm text-zk-muted">
                <span className="font-semibold text-zk-text">50 coins</span> a check
              </span>
            </div>
            <PrivacyNote className="mt-8 max-w-lg" />
          </div>
          <ExampleReport />
        </div>
      </section>

      <ol aria-label="How a check works" className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {[
          { title: "Add a site", text: "Paste a website, server address or GitHub repo. Ziki works out which it is." },
          { title: "Show it's yours", text: "Prove you own it, so nobody can point agents at someone else's site." },
          { title: "Get the report", text: "Agents look for weaknesses and tell you privately how to fix each one." },
        ].map((step, index) => (
          <li key={step.title} className="group flex gap-4 rounded-[20px] border border-zk-border bg-zk-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-zk-accent hover:shadow-[0_14px_30px_-22px_rgba(11,23,51,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zk-tint text-sm font-extrabold text-zk-accent transition group-hover:bg-electric-blue-strong group-hover:text-white">{index + 1}</span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-zk-text">{step.title}</p>
              <p className="m-0 mt-1 text-sm leading-relaxed text-zk-text2">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
