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
 * database at all: only their severities (for the counts) and the title and
 * description of the one worst result (the teaser). How to fix stays hidden.
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
  /** Already sent to the workspace with Fix on Ziki. */
  sentToZiki: boolean;
};

/** The one result an unpaid client sees: no how to fix. */
export type TeaserResult = { id: string; severity: SecuritySeverity; title: string; description: string };

type ReportBase = {
  checkId: string;
  status: SecurityCheckStatus;
  priceCoins: number;
  createdAt: Date;
  finishedAt: Date | null;
  target: { id: string; kind: SecurityTargetKind; input: string; verified: boolean };
  parts: ReportPart[];
  progress: { done: number; total: number; percent: number };
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

/**
 * The report for one check, or null when the check doesn't exist or belongs
 * to another workspace (callers answer "not found" either way).
 */
export async function loadCheckReport(checkId: string, organisationId: string): Promise<CheckReport | null> {
  const check = await prisma.securityCheck.findFirst({
    where: { id: checkId, organisationId },
    select: {
      id: true,
      status: true,
      paidAt: true,
      priceCoins: true,
      createdAt: true,
      finishedAt: true,
      target: { select: { id: true, kind: true, input: true, verifiedAt: true } },
      items: {
        where: { kind: "check" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, title: true, status: true },
      },
    },
  });
  if (!check) return null;

  const base = {
    checkId: check.id,
    status: check.status,
    priceCoins: check.priceCoins,
    createdAt: check.createdAt,
    finishedAt: check.finishedAt,
    target: { id: check.target.id, kind: check.target.kind, input: check.target.input, verified: check.target.verifiedAt !== null },
    parts: check.items,
    progress: partsProgress(check.items),
  };

  if (isCheckPaid(check)) {
    const rows = await prisma.securityCheckResult.findMany({
      where: { checkId: check.id },
      select: { id: true, severity: true, title: true, description: true, howToFix: true, createdAt: true, findingId: true },
    });
    return {
      ...base,
      paid: true,
      counts: countBySeverity(rows),
      total: rows.length,
      results: worstFirst(rows).map((row) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        howToFix: row.howToFix,
        sentToZiki: row.findingId !== null,
      })),
    };
  }

  // Unpaid: read only what the teaser needs. Severities for the counts, then
  // the worst result's title and description, never anyone's how to fix.
  const rows = await prisma.securityCheckResult.findMany({
    where: { checkId: check.id },
    select: { id: true, severity: true, createdAt: true },
  });
  const [worst] = worstFirst(rows);
  const teaser = worst
    ? await prisma.securityCheckResult.findUnique({
        where: { id: worst.id },
        select: { id: true, severity: true, title: true, description: true },
      })
    : null;
  return {
    ...base,
    paid: false,
    counts: countBySeverity(rows),
    total: rows.length,
    teaser,
    hiddenCount: teaser ? rows.length - 1 : rows.length,
  };
}
