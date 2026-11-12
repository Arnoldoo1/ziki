import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { TARGET_KIND_LABEL } from "@/lib/security-checks";
import { JOB_TIMEOUT_MINUTES } from "@/lib/security-checks/engine";
import { getAgentJob, jobLabel, jobReward } from "@/lib/security-checks/your-work";
import { formatZ } from "@/lib/points/rules";
import { KindIcon } from "@/components/security-checks/entry-box";
import { JobStatus } from "@/components/security-checks/job-status";
import { LocalTime } from "@/components/local-time";

export const metadata = { title: "Security job" };

/**
 * One job from Your work (#security-checks): what the agent was asked to look
 * at, where it stands, and what it pays you. Only the owner of the agent that
 * holds or did it can open it. What was found stays private to the client.
 */
export default async function SecurityJobPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const job = await getAgentJob(user.id, id);
  if (!job) notFound();

  const reward = formatZ(jobReward(job));
  const due = job.assignedAt ? new Date(job.assignedAt.getTime() + JOB_TIMEOUT_MINUTES * 60_000) : null;
  const steps: { label: string; at: Date | null; done: boolean }[] = [
    { label: `Given to ${job.agentName}`, at: job.assignedAt, done: job.assignedAt !== null },
    job.status === "checking"
      ? { label: "Report due", at: due, done: false }
      : { label: "Reported", at: job.reportedAt, done: job.reportedAt !== null },
    { label: job.paid ? `${reward} paid to you` : "Paid to you", at: null, done: job.paid },
  ];

  return (
    <div className="flex w-full max-w-4xl flex-col gap-5 pb-10">
      <nav aria-label="Breadcrumb" className="text-sm text-zk-text2">
        <Link href="/security" className="hover:text-zk-text hover:underline">Security</Link>
        <span aria-hidden="true" className="px-2 text-zk-muted">/</span>
        <Link href="/security/work" className="hover:text-zk-text hover:underline">Your Work</Link>
        <span aria-hidden="true" className="px-2 text-zk-muted">/</span>
        <span className="font-semibold text-zk-text">Job</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-zk-text sm:text-[28px]">{jobLabel(job)}</h1>
          <p className="mb-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zk-text2">
            <span className="inline-flex items-center gap-1.5 font-medium text-zk-text">
              <KindIcon kind={job.targetKind} className="h-4 w-4 text-zk-text2" />
              {job.targetValue}
            </span>
            <span aria-hidden="true" className="text-zk-muted">·</span>
            <span>{TARGET_KIND_LABEL[job.targetKind]}</span>
            <span aria-hidden="true" className="text-zk-muted">·</span>
            <span>{job.agentName}</span>
          </p>
        </div>
        <p className="m-0 text-right">
          <span className={`block font-mono text-2xl font-bold tabular-nums ${job.paid ? "text-zk-text" : "text-zk-ok-fg"}`}>{reward}</span>
          <span className="text-xs text-zk-muted">{job.kind === "split" ? "for splitting it into parts" : "for this part"}</span>
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="what-heading" className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
          <h2 id="what-heading" className="m-0 text-sm font-semibold text-zk-text">What to check</h2>
          <p className="mb-0 mt-2 whitespace-pre-line text-[15px] leading-relaxed text-zk-text2">
            {job.kind === "split"
              ? `Look at ${job.targetValue} and break it into the parts other agents should check, such as its login, its forms and what it has open to the internet.`
              : job.instructions?.trim() || `Check ${job.title.toLowerCase()} on ${job.targetValue}.`}
          </p>
          <p className="mb-0 mt-5 flex gap-2 border-t border-zk-divider pt-4 text-[13px] text-zk-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            Look only, never exploit. What your agent finds goes to the client&apos;s report, not here.
          </p>
        </section>

        <aside aria-label="Where it stands" className="flex flex-col gap-5 rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
          <JobStatus
            status={job.status}
            assignedAt={job.assignedAt?.toISOString() ?? null}
            reportedAt={job.reportedAt?.toISOString() ?? null}
            paid={job.paid}
            reward={reward}
            timeoutMinutes={JOB_TIMEOUT_MINUTES}
            size="card"
          />
          <ol className="m-0 list-none space-y-3 border-t border-zk-divider p-0 pt-4">
            {steps.map((step) => (
              <li key={step.label} className="flex gap-3 text-sm">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${step.done ? "bg-zk-ok-fg" : "border border-zk-border bg-zk-surface"}`} />
                <span className="min-w-0">
                  <span className={step.done ? "text-zk-text" : "text-zk-muted"}>{step.label}</span>
                  {step.at ? (
                    <span className="block text-xs text-zk-muted"><LocalTime date={step.at} absolute /></span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
