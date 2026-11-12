import Link from "next/link";
import { notFound } from "next/navigation";
import type { SecurityCheckStatus } from "@prisma/client";
import { LiveRefresh } from "@/components/live-refresh";
import { Badge } from "@/components/ui/badge";
import { statusClass, substatusClass } from "@/lib/labels";
import { LocalTime } from "@/components/local-time";
import { ReportProgress } from "@/components/security-checks/report-progress";
import { ReportResults } from "@/components/security-checks/report-results";
import { requireUser } from "@/lib/auth-helpers";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { CHECK_STATUS_LABEL, FINISHED_CHECK_STATUSES, TARGET_KIND_LABEL } from "@/lib/security-checks";
import { loadCheckReport } from "@/lib/security-checks/report";
import { OrgPageHeader, orgCard } from "../../../[org]/[project]/org/org-ui";

export const metadata = { title: "Security check" };

/** Ziki's issue status colours, by meaning: waiting on the client like Requires confirmation, working like In progress, finished like Live. */
const CHECK_STATUS_CLASS: Record<SecurityCheckStatus, string> = {
  awaiting_ownership: substatusClass.requires_confirmation,
  queued: substatusClass.requires_confirmation,
  splitting: statusClass.in_progress,
  checking: statusClass.in_progress,
  done: statusClass.resolved,
  cancelled: statusClass.closed,
};

/** What each step tells the client while there are no parts to list yet. */
const WAITING_NOTE: Partial<Record<keyof typeof CHECK_STATUS_LABEL, string>> = {
  queued: "An agent will start planning the checks soon.",
  splitting: "An agent is looking at it and planning the checks.",
  cancelled: "This check was cancelled.",
};

/**
 * One security check (#security-checks, part 4): how far the agents have got,
 * then the report. Only the check's own workspace sees it. Until it is paid,
 * the report is the teaser that `loadCheckReport` builds.
 */
export default async function SecurityCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const access = await currentOrganisationAccess(user.id, user.role);
  if (!access.organisationId) notFound();
  const report = await loadCheckReport(id, access.organisationId);
  if (!report) notFound();

  const linkClass = "font-semibold text-zk-accent hover:underline";
  const working = !FINISHED_CHECK_STATUSES.has(report.status);
  const awaitingOwnership = report.status === "awaiting_ownership";

  return (
    <div className="flex w-full flex-col gap-4 pb-10 sm:gap-6">
      {working ? <LiveRefresh /> : null}
      <Link href="/security" className={linkClass}>Back to Security</Link>

      <OrgPageHeader
        heading="h1"
        title="Security check"
        actions={
          <Badge className={CHECK_STATUS_CLASS[report.status]}>{CHECK_STATUS_LABEL[report.status]}</Badge>
        }
      >
        <span className="wrap-break-word">
          {TARGET_KIND_LABEL[report.target.kind]}: <span className="font-semibold text-zk-text">{report.target.input}</span>
        </span>{" "}
        · Asked for <LocalTime date={report.createdAt} />
      </OrgPageHeader>

      {awaitingOwnership ? (
        <section aria-labelledby="ownership-heading" className={orgCard}>
          <h2 id="ownership-heading" className="text-base font-semibold text-zk-text">Show it&apos;s yours</h2>
          <p className="mt-1 text-sm text-zk-text2">
            Agents start only once you prove this {TARGET_KIND_LABEL[report.target.kind].toLowerCase()} is yours. You do this once.
          </p>
          <Link href={`/security/targets/${report.target.id}/verify`} className={`mt-3 inline-block ${linkClass}`}>
            Prove ownership
          </Link>
        </section>
      ) : (
        <section aria-labelledby="progress-heading" className={orgCard}>
          <h2 id="progress-heading" className="text-base font-semibold text-zk-text">Progress</h2>
          <div className="mt-3">
            {report.parts.length ? (
              <ReportProgress progress={report.progress} parts={report.parts} />
            ) : (
              <p className="text-sm text-zk-text2">{WAITING_NOTE[report.status] ?? "No parts to check."}</p>
            )}
          </div>
        </section>
      )}

      {!awaitingOwnership ? (
        <section aria-labelledby="report-heading" className={orgCard}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="report-heading" className="text-base font-semibold text-zk-text">Report</h2>
              <p className="text-xs text-zk-muted">Worst first.</p>
            </div>
            {/* A plain link: a full download, not a client-side navigation. */}
            <a href={`/security/checks/${report.checkId}/report.pdf`} className={`text-sm ${linkClass}`}>
              Download PDF
            </a>
          </div>
          <div className="mt-3">
            <ReportResults report={report} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
