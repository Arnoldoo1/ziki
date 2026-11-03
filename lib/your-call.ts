import { prisma } from "@/lib/prisma";
import { DECISION_MARKER, type Urgency, type YourCallItem } from "@/lib/your-call-shared";

/**
 * Your call (#your-call): the open issues a person has to settle
 * because the agents split on them. Two kinds:
 * - a delivered fix (Done · Requires review) whose judgements on the pull
 *   request now linked disagree: some say good to merge, some say not;
 * - a report (Open · Requires confirmation) whose confirmations disagree:
 *   some confirm it, some reject it.
 * When the agents agree, the rules move the issue on and it never shows here.
 */

const DAY = 24 * 60 * 60 * 1000;
/** A milestone due within this many days makes its stuck issues Critical. */
export const MILESTONE_SOON_DAYS = 7;
/** Split for longer than this, an issue is at least High. */
export const LONG_WAIT_DAYS = 7;

/** What urgency reads about one issue. */
export type UrgencySignals = {
  isBoosted: boolean;
  /** Importance marks (`Bug.voteCount`). */
  importance: number;
  reward: number;
  milestone: { title: string; dueDate: Date | null } | null;
  /** When the agents split. */
  since: Date;
};

/**
 * The project's yardsticks: importance and reward are judged against the
 * project's other open work, so a busy project doesn't turn everything
 * Critical. Each is the value an issue must reach (0 when nothing has any).
 */
export type ProjectYardsticks = { topImportance: number; highImportance: number; highReward: number };

/** The value at fraction `q` (0–1) of the sorted positive values; 0 when there are none. */
export function quantile(values: number[], q: number): number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

export function yardsticksFor(open: { importance: number; reward: number }[]): ProjectYardsticks {
  const importance = open.map((o) => o.importance);
  return {
    topImportance: quantile(importance, 0.9),
    highImportance: quantile(importance, 0.7),
    highReward: quantile(open.map((o) => o.reward), 0.9),
  };
}

/**
 * How much the stuck issue holds the project back, and why:
 * - Critical: boosted, in a milestone due within 7 days (or overdue), or
 *   among the project's most important open issues (top 10% by importance);
 * - High: high importance (top 30%), split for over a week, or one of the
 *   project's best-paid issues (top 10% by reward);
 * - Medium: any importance marks, or a reward above the default;
 * - Low: everything else.
 */
export function urgencyOf(s: UrgencySignals, y: ProjectYardsticks, now = Date.now()): { urgency: Urgency; reasons: string[] } {
  const critical: string[] = [];
  if (s.isBoosted) critical.push("Boosted");
  if (s.milestone?.dueDate) {
    const days = Math.ceil((s.milestone.dueDate.getTime() - now) / DAY);
    if (days <= MILESTONE_SOON_DAYS) {
      critical.push(days < 0 ? `Milestone ${s.milestone.title} overdue` : days === 0 ? `Milestone ${s.milestone.title} due today` : `Milestone ${s.milestone.title} due in ${days} ${days === 1 ? "day" : "days"}`);
    }
  }
  if (s.importance > 0 && y.topImportance > 0 && s.importance >= y.topImportance) critical.push(`Among the most important (${s.importance} marks)`);
  if (critical.length) return { urgency: "critical", reasons: critical };

  const high: string[] = [];
  if (s.importance > 0 && y.highImportance > 0 && s.importance >= y.highImportance) high.push(`High importance (${s.importance} marks)`);
  const waited = Math.floor((now - s.since.getTime()) / DAY);
  if (waited > LONG_WAIT_DAYS) high.push(`Split for ${waited} days`);
  if (s.reward > 1 && y.highReward > 1 && s.reward >= y.highReward) high.push(`Reward $${s.reward}`);
  if (high.length) return { urgency: "high", reasons: high };

  const medium: string[] = [];
  if (s.importance > 0) medium.push(`${s.importance} importance ${s.importance === 1 ? "mark" : "marks"}`);
  if (s.reward > 1) medium.push(`Reward $${s.reward}`);
  if (medium.length) return { urgency: "medium", reasons: medium };

  return { urgency: "low", reasons: ["Nothing marks it as urgent yet"] };
}

const OPEN_WORK = ["open", "in_progress", "done", "merge"] as const;

export async function loadYourCall(projectId: string): Promise<YourCallItem[]> {
  const [issues, open] = await Promise.all([
    prisma.bug.findMany({
      where: { projectId, isDeleted: false, substatus: { in: ["requires_review", "requires_confirmation"] } },
      select: {
        id: true, number: true, title: true, summary: true, substatus: true, pullRequestUrl: true, updatedAt: true,
        voteCount: true, isBoosted: true, reward: true,
        milestone: { select: { title: true, dueDate: true } },
        project: { select: { slug: true } },
        // A person's answer given here: once it is in, the issue is no longer waiting on them.
        comments: { where: { deletedAt: null, body: { startsWith: DECISION_MARKER } }, select: { createdAt: true } },
        testVerdicts: {
          orderBy: { createdAt: "asc" },
          select: { goodToMerge: true, summary: true, pullRequestUrl: true, createdAt: true, agentId: true, agent: { select: { name: true } } },
        },
        confirmations: {
          where: { undoneAt: null, verdict: { in: ["confirm", "reject"] } },
          orderBy: { createdAt: "asc" },
          select: { verdict: true, summary: true, createdAt: true, agentId: true, agent: { select: { name: true } } },
        },
      },
    }),
    // The yardsticks: every open piece of work in the project.
    prisma.bug.findMany({
      where: { projectId, isDeleted: false, status: { in: [...OPEN_WORK] } },
      select: { voteCount: true, reward: true },
    }),
  ]);
  const yardsticks = yardsticksFor(open.map((o) => ({ importance: o.voteCount, reward: Number(o.reward) })));

  const items: YourCallItem[] = [];
  for (const issue of issues) {
    // The judgements that count are the ones on the pull request linked now.
    const votes =
      issue.substatus === "requires_review"
        ? issue.testVerdicts
            .filter((v) => v.pullRequestUrl === issue.pullRequestUrl)
            .map((v) => ({ yes: v.goodToMerge, agentId: v.agentId, agentName: v.agent.name, says: v.summary, at: v.createdAt }))
        : issue.confirmations.map((c) => ({
            yes: c.verdict === "confirm",
            agentId: c.agentId ?? `person-${c.createdAt.getTime()}`,
            agentName: c.agent?.name ?? "A person",
            says: c.summary,
            at: c.createdAt,
          }));
    const yes = votes.filter((v) => v.yes);
    const no = votes.filter((v) => !v.yes);
    if (!yes.length || !no.length) continue;
    // Waiting since the agents split: the first vote that went against the first one.
    const ordered = [...votes].sort((a, b) => a.at.getTime() - b.at.getTime());
    const split = ordered.find((v) => v.yes !== ordered[0]!.yes)!;
    if (issue.comments.some((c) => c.createdAt > split.at)) continue;
    const { urgency, reasons } = urgencyOf(
      { isBoosted: issue.isBoosted, importance: issue.voteCount, reward: Number(issue.reward), milestone: issue.milestone, since: split.at },
      yardsticks,
    );
    items.push({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      summary: issue.summary,
      kind: issue.substatus === "requires_review" ? "merge" : "confirm",
      urgency,
      reasons,
      yes: yes.map(({ agentId, agentName, says }) => ({ agentId, agentName, says })),
      no: no.map(({ agentId, agentName, says }) => ({ agentId, agentName, says })),
      since: split.at,
      href: `/${encodeURIComponent(issue.project.slug)}/${issue.number}`,
    });
  }
  return items;
}
