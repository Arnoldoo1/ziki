import Link from "next/link";
import type { SecuritySeverity } from "@prisma/client";
import { RichText } from "@/components/rich-text";
import { SeverityChip } from "@/components/security-finding-panel";
import { FINISHED_CHECK_STATUSES } from "@/lib/security-checks";
import type { CheckReport, SeverityCounts } from "@/lib/security-checks/report";
import { SECURITY_SEVERITIES, SEVERITY_LABEL } from "@/lib/security-severity";

/**
 * The problems a security check found (#security-checks, part 4), worst
 * first. A paid check shows every one with how to fix it. An unpaid one shows
 * only what `loadCheckReport` handed over: the worst problem without its fix,
 * and how many more there are.
 */
export function ReportResults({ report }: { report: CheckReport }) {
  if (report.total === 0) {
    return (
      <p className="text-sm text-zk-text2">
        {report.status === "done" ? "The agents found no problems." : "Nothing found yet. Problems show up here as agents find them."}
      </p>
    );
  }

  if (report.paid) {
    return (
      <div className="space-y-4">
        <CountsLine counts={report.counts} prefix={`${report.total} ${report.total === 1 ? "problem" : "problems"}:`} />
        <ol className="space-y-3">
          {report.results.map((result) => (
            <li key={result.id}>
              <ProblemCard severity={result.severity} title={result.title} description={result.description} sentToZiki={result.sentToZiki}>
                <div className="mt-3 rounded-[14px] bg-zk-tint p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zk-muted">How to fix</h4>
                  <RichText content={result.howToFix} className="mt-1 text-sm" />
                </div>
              </ProblemCard>
            </li>
          ))}
        </ol>
        {/* Fix on Ziki (part 5, agreed with Oluwasanmi): once his
            components/security-checks/fix-on-ziki.tsx is on main, render
            <FixOnZiki checkId={report.checkId} results={report.results.map(({ id, severity, title }) => ({ id, severity, title }))} />
            here. This branch is the paid one, so it never shows unpaid. */}
      </div>
    );
  }

  const rest = restCounts(report.counts, report.teaser?.severity);
  /** Agents are still at work, so the counts can still grow. */
  const still = !FINISHED_CHECK_STATUSES.has(report.status);
  return (
    <div className="space-y-4">
      {report.teaser ? (
        <ProblemCard severity={report.teaser.severity} title={report.teaser.title} description={report.teaser.description}>
          <p className="mt-3 rounded-[14px] bg-zk-tint p-3 text-sm text-zk-text2">How to fix it is in the full report.</p>
        </ProblemCard>
      ) : null}
      <div className="rounded-[14px] border border-zk-warn-bd bg-zk-warn-bg p-4">
        {report.hiddenCount > 0 ? (
          <CountsLine
            counts={rest}
            prefix={`${report.hiddenCount} more ${report.hiddenCount === 1 ? "problem" : "problems"} found${still ? " so far" : ""}:`}
          />
        ) : (
          <p className="text-sm font-medium text-zk-text">No other problems found{still ? " so far" : ""}.</p>
        )}
        <Link
          href={`/security/checks/${report.checkId}/pay`}
          className="mt-3 inline-flex h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
        >
          Pay {report.priceCoins} coins to see all
        </Link>
      </div>
    </div>
  );
}

function ProblemCard({
  severity,
  title,
  description,
  sentToZiki = false,
  children,
}: {
  severity: SecuritySeverity;
  title: string;
  description: string;
  sentToZiki?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-[14px] border border-zk-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityChip severity={severity} />
        {sentToZiki ? <span className="rounded-full bg-zk-ok-bg px-2.5 py-0.5 text-xs font-semibold text-zk-ok-fg">Sent to Ziki</span> : null}
      </div>
      <h3 className="mt-2 wrap-break-word text-base font-semibold text-zk-text">{title}</h3>
      <RichText content={description} className="mt-1 text-sm" />
      {children}
    </article>
  );
}

/** "3 high · 5 medium · 2 low": only the severities that have any. */
function CountsLine({ counts, prefix }: { counts: SeverityCounts; prefix: string }) {
  const parts = SECURITY_SEVERITIES.filter((level) => counts[level] > 0).map(
    (level) => `${counts[level]} ${SEVERITY_LABEL[level].toLowerCase()}`,
  );
  return (
    <p className="text-sm font-medium text-zk-text">
      {prefix} {parts.join(" · ")}
    </p>
  );
}

/** The counts without the one problem already shown as the teaser. */
function restCounts(counts: SeverityCounts, shown: SecuritySeverity | undefined): SeverityCounts {
  if (!shown) return counts;
  return { ...counts, [shown]: counts[shown] - 1 };
}
