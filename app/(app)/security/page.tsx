import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { prisma } from "@/lib/prisma";
import { loadSecurityDashboard, type DashboardFinding } from "@/lib/security-dashboard";
import { isSecuritySeverity, SECURITY_SEVERITIES, SEVERITY_GUIDE, SEVERITY_LABEL } from "@/lib/security-severity";
import { newIssuePath, type ProjectRef } from "@/lib/project-paths";
import { SeverityChip } from "@/components/security-finding-panel";
import { AgentClearanceToggle } from "@/components/security-finding-controls";
import { PipelineSteps } from "@/components/pipeline-steps";
import { filterSecurityFindingsByStage, parseSecurityStageFilter, SecurityStageFilterBar } from "@/components/security-stage-filter";
import { LocalTime } from "@/components/local-time";
import { WhimsicalEmptyState } from "@/components/whimsical-empty-state";
import { OrgPageHeader, ReadOnlyNote, orgCard, orgListCard } from "../[org]/[project]/org/org-ui";

export const metadata = { title: "Security" };

/**
 * The Security area (#security-findings): report a vulnerability privately,
 * see how exposed the workspace is, follow each finding to its fix, and read
 * the ones already disclosed. Owners and admins also choose which agents may
 * read private findings.
 */
type SearchParams = Promise<{ severity?: string | string[]; stage?: string | string[] }>;

export default async function SecurityPage(props: {
  searchParams?: SearchParams;
}) {
  const params = (await props.searchParams) ?? {};
  const severity = typeof params.severity === "string" ? params.severity.toLowerCase() : "";
  const selectedSeverity = isSecuritySeverity(severity) ? severity : "all";
  const selectedStage = parseSecurityStageFilter(params.stage);
  const user = await requireUser();
  const access = await currentOrganisationAccess(user.id, user.role);
  if (!access.organisationId) {
    return (
      <div className="space-y-4">
        <OrgPageHeader heading="h1" title="Security">Report and track security findings.</OrgPageHeader>
        <ReadOnlyNote>Join or create a workspace to report and track security findings.</ReadOnlyNote>
      </div>
    );
  }
  const organisationId = access.organisationId;
  const dashboard = await loadSecurityDashboard(organisationId, { kind: "person", userId: user.id, organisationId, organisationAdmin: access.admin });
  const agents = access.admin
    ? (
        await prisma.agentActivation.findMany({
          where: { organisationId, deactivatedAt: null, agent: { revokedAt: null } },
          orderBy: [{ securityCleared: "desc" }, { agent: { name: "asc" } }],
          take: 200,
          select: { level: true, securityCleared: true, agent: { select: { id: true, name: true, owner: { select: { name: true } } } } },
        })
      ).map(({ agent, level, securityCleared }) => ({ ...agent, level, securityCleared }))
    : [];
  const filteredOpen = selectedSeverity === "all"
    ? dashboard.open
    : dashboard.open.filter((f) => f.severity === selectedSeverity);

  const filteredDisclosed = selectedSeverity === "all"
    ? dashboard.disclosed
    : dashboard.disclosed.filter((f) => f.severity === selectedSeverity);

  const visibleOpen = filterSecurityFindingsByStage(filteredOpen, selectedStage);
  const stageQuery = selectedStage === "all" ? "" : `stage=${selectedStage}`;
  const findings = [...dashboard.open, ...dashboard.disclosed];
  const severitySteps = (["all", ...SECURITY_SEVERITIES] as const).map((level) => ({
    label: level === "all" ? "All" : SEVERITY_LABEL[level],
    count: level === "all" ? findings.length : findings.filter((finding) => finding.severity === level).length,
    href: "/security" + (level === "all"
      ? (stageQuery ? `?${stageQuery}` : "")
      : `?severity=${level}${stageQuery ? `&${stageQuery}` : ""}`),
    selected: selectedSeverity === level,
  }));
  const openCount = dashboard.open.length;
  const severe = dashboard.openBySeverity.critical + dashboard.openBySeverity.high;

  return (
    <div className="flex w-full flex-col gap-4 pb-10 sm:gap-6">
      <OrgPageHeader heading="h1" title="Security" actions={<ReportButton projects={dashboard.projects} />}>
        Report vulnerabilities privately. A workspace owner or admin decides when to publish them.
      </OrgPageHeader>

      <section aria-label="Summary" className={`${orgListCard} grid grid-cols-2 sm:grid-cols-4`}>
        <Stat label="Open findings" value={String(openCount)} hint={openCount ? "Private until published" : "Nothing open"} />
        <Stat
          label="Critical and high"
          value={String(severe)}
          hint={`${dashboard.openBySeverity.critical} critical, ${dashboard.openBySeverity.high} high`}
          alert={severe > 0}
        />
        <Stat label="Disclosed" value={String(dashboard.disclosed.length)} hint="Details now public" />
        <Stat
          label="Median time to disclose"
          value={dashboard.medianDaysToDisclosure === null ? "–" : `${dashboard.medianDaysToDisclosure} d`}
          hint="From report to publication"
        />
      </section>

      <div className="flex justify-center">
        <PipelineSteps stages={severitySteps} label="Filter findings by severity" />
      </div>

      <section aria-labelledby="open-heading" className={orgCard}>
        <h2 id="open-heading" className="text-base font-semibold text-zk-text">Open findings</h2>
        <p className="text-xs text-zk-muted">Worst first, then oldest.</p>
        <div className="mt-3">
          <SecurityStageFilterBar findings={filteredOpen} selected={selectedStage} severity={selectedSeverity} />
        </div>
        {visibleOpen.length ? (
          <FindingTable findings={visibleOpen} kind="open" />
        ) : (
          <div className="mt-4">
            <WhimsicalEmptyState
              title={selectedSeverity === "all" && selectedStage === "all" ? "No open security findings" : "No open findings match these filters"}
              description={selectedSeverity === "all" && selectedStage === "all" ? "Private reports appear here while they await disclosure." : "Clear the filters to see all open findings."}
              clearHref="/security"
              createHref="/security"
              showClear={selectedSeverity !== "all" || selectedStage !== "all"}
              showCreate={false}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="disclosed-heading" className={orgCard}>
        <h2 id="disclosed-heading" className="text-base font-semibold text-zk-text">Disclosed</h2>
        {filteredDisclosed.length ? (
          <FindingTable findings={filteredDisclosed} kind="disclosed" />
        ) : (
          <p className="mt-3 text-sm text-zk-text2">Findings appear here after a workspace owner or admin publishes them.</p>
        )}
      </section>

      <section aria-labelledby="severity-heading" className={orgCard}>
        <h2 id="severity-heading" className="text-base font-semibold text-zk-text">How to rate severity</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {SECURITY_SEVERITIES.map((level) => (
            <div key={level} className="space-y-1">
              <dt><SeverityChip severity={level} /></dt>
              <dd className="text-sm text-zk-text2">{SEVERITY_GUIDE[level]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {access.admin ? (
        <section aria-labelledby="agents-heading" className={orgCard}>
          <h2 id="agents-heading" className="text-base font-semibold text-zk-text">Agents cleared for security work</h2>
          <p className="mt-1 text-sm text-zk-text2">
            A cleared agent can read every private finding in this workspace, through the API and its files, so it can
            confirm, fix and test them. Only owners and admins see this list. An agent can always read findings its own
            owner reported.
          </p>
          {agents.length ? (
            <ul className="mt-3 divide-y divide-zk-border">
              {agents.map((agent) => (
                <li key={agent.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-zk-text">{agent.name}</span>{" "}
                    <span className="text-zk-muted">
                      {agent.level} agent of {agent.owner?.name ?? "someone"}
                    </span>
                  </span>
                  <AgentClearanceToggle agentId={agent.id} agentName={agent.name} cleared={agent.securityCleared} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zk-text2">No agents in this workspace yet.</p>
          )}
        </section>
      ) : null}
      <section aria-labelledby="policy-heading" className={orgCard}>
        <h2 id="policy-heading" className="text-base font-semibold text-zk-text">Responsible disclosure</h2>
        <div className="mt-3">
          <ReadOnlyNote>
            Share sensitive evidence through the private report. A workspace owner or admin decides when to publish the finding.
          </ReadOnlyNote>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, alert = false }: { label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div className="min-w-0 p-4">
      <p className="text-sm font-medium text-zk-text2">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${alert ? "text-zk-bad-fg" : "text-zk-text"}`}>{value}</p>
      <p className="mt-1 text-xs text-zk-text2">{hint}</p>
    </div>
  );
}

function FindingTable({ findings, kind }: { findings: DashboardFinding[]; kind: "open" | "disclosed" }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-zk-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">Severity</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Finding</th>
            <th scope="col" className="hidden py-2 pr-3 font-semibold sm:table-cell">Status</th>
            <th scope="col" className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">{kind === "open" ? "Open for" : "Took"}</th>
            {kind === "disclosed" ? <th scope="col" className="hidden py-2 font-semibold sm:table-cell">Disclosed</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-zk-border">
          {findings.map((finding) => (
            <tr key={finding.id}>
              <td className="py-2 pr-3 align-top"><SeverityChip severity={finding.severity} /></td>
              <td className="py-2 pr-3 align-top">
                <Link href={finding.href} className="font-semibold text-zk-accent hover:underline">{finding.ref}</Link>{" "}
                {finding.title ? (
                  <span className="break-words text-zk-text">{finding.title}</span>
                ) : (
                  <span className="italic text-zk-muted">Details restricted</span>
                )}
                <span className="block text-xs text-zk-muted">{finding.project}</span>
                <span className="block text-xs text-zk-text2 sm:hidden">{finding.stage} · {finding.days} d</span>
                {finding.disclosedAt ? <span className="block text-xs text-zk-text2 sm:hidden"><LocalTime date={finding.disclosedAt} /></span> : null}
              </td>
              <td className="hidden py-2 pr-3 align-top text-zk-text2 sm:table-cell">{finding.stage}</td>
              <td className="hidden py-2 pr-3 text-right align-top tabular-nums text-zk-text2 sm:table-cell">{finding.days} d</td>
              {kind === "disclosed" ? (
                <td className="hidden py-2 align-top text-xs text-zk-text2 sm:table-cell">
                  {finding.disclosedAt ? <LocalTime date={finding.disclosedAt} /> : null}
                  <span className="block">{finding.fixedLive ? "Fix live" : "Published by an owner or admin"}</span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REPORT_BUTTON =
  "inline-flex h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2";

/** "Report a vulnerability": straight to the form in a one-project workspace, else pick the project. */
function ReportButton({ projects }: { projects: { name: string; ref: ProjectRef }[] }) {
  if (projects.length === 0) return null;
  if (projects.length === 1) {
    // A full page load, so the quick-report modal doesn't intercept it.
    return <a href={newIssuePath(projects[0].ref, "security=1")} className={REPORT_BUTTON}>Report a vulnerability</a>;
  }
  return (
    <details className="security-report relative">
      <summary className={`${REPORT_BUTTON} cursor-pointer list-none`}>Report a vulnerability</summary>
      <div className="absolute left-0 z-10 mt-2 w-64 sm:left-auto sm:right-0 rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-lg">
        <p className="px-2 py-1 text-xs text-zk-muted">Which product is it in?</p>
        <ul>
          {projects.map((project) => (
            <li key={project.ref}>
              <a href={newIssuePath(project.ref, "security=1")} className="block rounded-xl px-2 py-1.5 text-sm text-zk-text hover:bg-zk-bg">
                {project.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
