import "server-only";
import type {
  SecurityCheckItemStatus,
  SecurityCheckStatus,
  SecuritySeverity,
  SecurityTargetKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isCheckPaid } from "@/lib/security-checks";
import { SECURITY_SEVERITIES } from "@/lib/security-severity";

/**
 * What a client may see of one security check (#security-checks, part 4).
 * The page and the PDF both read the report through `loadCheckReport`, so
 * they always show the same thing.
 *
 * Until the check is paid, the hidden results' text is never read from the
 * database at all: only their severities and parts (for the counts) and the
 * title and description of the one worst result (the teaser). How to fix
 * stays hidden.
 */

export type SeverityCounts = Record<SecuritySeverity, number>;

/** One part of the check, as the client sees it on the progress screen. */
export type ReportPart = { id: string; title: string; status: SecurityCheckItemStatus };

/** A result in full: only ever built for a paid check. */
export type FullResult = {
  id: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  howToFix: string;
  /** The agent that found it; null if it has since been removed. */
  agent: ReportAgent | null;
  /** Already sent to the workspace with Fix on Ziki. */
  sentToZiki: boolean;
};

/** The one result an unpaid client sees: no how to fix. */
export type TeaserResult = { id: string; severity: SecuritySeverity; title: string; description: string; agent: ReportAgent | null };

/** Who found a problem, enough to draw its Ziki avatar. */
export type ReportAgent = { id: string; name: string; avatar: string | null };

type ReportBase = {
  checkId: string;
  status: SecurityCheckStatus;
  priceCoins: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  /** `value` is the tidy form ("settle.ng"); `input` is what the client typed. */
  target: { id: string; kind: SecurityTargetKind; value: string; input: string; verified: boolean };
  parts: ReportPart[];
  progress: { done: number; total: number; percent: number };
  /** How many different agents worked on the parts. */
  agentCount: number;
  /** Finished parts that found nothing, by title. */
  clearParts: string[];
  counts: SeverityCounts;
  total: number;
};

export type CheckReport =
  | (ReportBase & { paid: true; results: FullResult[] })
  | (ReportBase & { paid: false; teaser: TeaserResult | null; hiddenCount: number });

/** Lower is worse: critical first. */
function severityRank(severity: SecuritySeverity): number {
  return SECURITY_SEVERITIES.indexOf(severity);
}

/** Worst first, then the oldest, then by id so the order never wobbles. */
export function worstFirst<T extends { id: string; severity: SecuritySeverity; createdAt: Date }>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function countBySeverity(rows: readonly { severity: SecuritySeverity }[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) counts[row.severity] += 1;
  return counts;
}

/** Finished parts out of all parts. A skipped part counts as finished. */
export function partsProgress(parts: readonly { status: SecurityCheckItemStatus }[]): ReportBase["progress"] {
  const total = parts.length;
  const done = parts.filter((part) => part.status === "done" || part.status === "skipped").length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Parts an agent finished without finding anything. */
export function clearPartTitles(parts: readonly ReportPart[], results: readonly { itemId: string }[]): string[] {
  const withResults = new Set(results.map((result) => result.itemId));
  return parts.filter((part) => part.status === "done" && !withResults.has(part.id)).map((part) => part.title);
}

const AGENT_OF_RESULT = { item: { select: { agent: { select: { id: true, name: true, avatar: true } } } } } as const;

/**
 * The report for one check, or null when the check doesn't exist, belongs to
 * another workspace, or was asked for by someone else: each check is its
 * requester's alone, as on the pay page (#640). Callers answer "not found".
 */
export async function loadCheckReport(checkId: string, organisationId: string, userId: string): Promise<CheckReport | null> {
  const check = await prisma.securityCheck.findFirst({
    where: { id: checkId, organisationId, requestedById: userId },
    select: {
      id: true,
      status: true,
      paidAt: true,
      priceCoins: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      target: { select: { id: true, kind: true, value: true, input: true, verifiedAt: true } },
      items: {
        where: { kind: "check" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, title: true, status: true, agentId: true },
      },
    },
  });
  if (!check) return null;

  const parts = check.items.map(({ id, title, status }) => ({ id, title, status }));
  const base = {
    checkId: check.id,
    status: check.status,
    priceCoins: check.priceCoins,
    createdAt: check.createdAt,
    startedAt: check.startedAt,
    finishedAt: check.finishedAt,
    target: {
      id: check.target.id,
      kind: check.target.kind,
      value: check.target.value,
      input: check.target.input,
      verified: check.target.verifiedAt !== null,
    },
    parts,
    progress: partsProgress(parts),
    agentCount: new Set(check.items.map((item) => item.agentId).filter(Boolean)).size,
  };

  if (isCheckPaid(check)) {
    const rows = await prisma.securityCheckResult.findMany({
      where: { checkId: check.id },
      select: { id: true, itemId: true, severity: true, title: true, description: true, howToFix: true, createdAt: true, findingId: true, ...AGENT_OF_RESULT },
    });
    return {
      ...base,
      paid: true,
      clearParts: clearPartTitles(parts, rows),
      counts: countBySeverity(rows),
      total: rows.length,
      results: worstFirst(rows).map((row) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        howToFix: row.howToFix,
        agent: row.item.agent ?? null,
        sentToZiki: row.findingId !== null,
      })),
    };
  }

  // Unpaid: read only what the teaser needs. Severities and parts for the
  // counts, then the worst result's title and description, never anyone's
  // how to fix.
  const rows = await prisma.securityCheckResult.findMany({
    where: { checkId: check.id },
    select: { id: true, itemId: true, severity: true, createdAt: true },
  });
  const [worst] = worstFirst(rows);
  const found = worst
    ? await prisma.securityCheckResult.findUnique({
        where: { id: worst.id },
        select: { id: true, severity: true, title: true, description: true, ...AGENT_OF_RESULT },
      })
    : null;
  const teaser = found
    ? { id: found.id, severity: found.severity, title: found.title, description: found.description, agent: found.item.agent ?? null }
    : null;
  return {
    ...base,
    paid: false,
    clearParts: clearPartTitles(parts, rows),
    counts: countBySeverity(rows),
    total: rows.length,
    teaser,
    hiddenCount: teaser ? rows.length - 1 : rows.length,
  };
}
