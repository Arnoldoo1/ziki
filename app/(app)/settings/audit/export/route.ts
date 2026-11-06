import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentOrganisationIdFor } from "@/lib/organisation-context";
import { isOrganisationAdminRole } from "@/lib/agents/membership";
import { auditAccess, auditWhere } from "@/lib/agent-audit/visibility";
import { activeIn } from "@/lib/agents/active-in";
import { CSV_EOL, csvRow } from "@/lib/csv";

const single = (v: string | null) => (v && v.trim() ? v.trim() : null);

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const organisationId = await currentOrganisationIdFor(user.id);
  const membership = organisationId
    ? await prisma.membership.findUnique({
        where: { organisationId_userId: { organisationId, userId: user.id } },
        select: { role: true },
      })
    : null;
  const organisation = organisationId ? { organisationId, role: membership?.role } : null;
  const owned = organisation
    ? await prisma.agent.findMany({
        where: { ownerUserId: user.id, ...activeIn(organisation.organisationId) },
        select: { id: true },
      })
    : [];
  const access = auditAccess({
    isAdminOfOrganisation: isOrganisationAdminRole(organisation?.role, user.role),
    organisationId: organisation?.organisationId ?? null,
    ownedAgentIds: owned.map((a) => a.id),
  });
  if (access.kind === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const agentId = single(params.get("agent"));
  const issueInput = single(params.get("issue"));
  const q = single(params.get("q"));
  const actionFilter = single(params.get("action"));
  const from = single(params.get("from"));
  const to = single(params.get("to"));
  const includeRequests = params.get("show") === "requests";

  // Resolve issue filter the same way as the page.
  let issueId: string | null = null;
  if (issueInput) {
    const { parseIssueRef } = await import("@/lib/duplicates");
    const ref = parseIssueRef(issueInput);
    if (ref && "number" in ref) {
      const found = await prisma.bug.findFirst({
        where: { number: ref.number, organisationId: access.organisationId },
        select: { id: true },
      });
      issueId = found?.id ?? null;
    } else {
      issueId = ref?.id ?? issueInput;
    }
    if (!issueId) {
      return new NextResponse("No matching issue", { status: 404 });
    }
  }

  const where = {
    AND: [
      auditWhere(access, { agentId, issueId, includeRequests }),
      ...(actionFilter ? [{ action: actionFilter }] : []),
      ...(q ? [{ OR: [{ action: { contains: q, mode: "insensitive" as const } }, { target: { contains: q, mode: "insensitive" as const } }] }] : []),
      ...(from || to ? [{ createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }] : []),
    ],
  };

  const rows = await prisma.agentAuditEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10000,
    select: {
      id: true,
      createdAt: true,
      action: true,
      target: true,
      agent: { select: { name: true } },
      bug: { select: { number: true } },
      payload: true,
      undoneAt: true,
    },
  });

  const header = ["id", "created_at", "agent", "action", "target", "issue", "undone_at", "payload"];
  const lines = [csvRow(header)];
  for (const r of rows) {
    lines.push(
      csvRow([
        r.id,
        r.createdAt.toISOString(),
        r.agent.name,
        r.action,
        r.target ?? "",
        r.bug ? `#${r.bug.number}` : "",
        r.undoneAt ? new Date(r.undoneAt).toISOString() : "",
        JSON.stringify(r.payload ?? null),
      ]),
    );
  }
  const csv = lines.join(CSV_EOL) + CSV_EOL;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
    },
  });
}