import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { agentIssueRequest, issueProject, IssueApiError } from "@/lib/agent-api/issues";
import { issueIdFor } from "@/lib/issue-ref";
import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";

const schema = z.object({ plan: z.string().trim().min(1).max(280) }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; steerId: string }> }) {
  const { id, steerId } = await context.params;
  return agentIssueRequest(request, "issues.steer_ack", "working", id, async (agent) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "plan is required and must be at most 280 characters." }, { status: 400 });
    const scope = await issueProject(agent, request.nextUrl.searchParams);
    const bugId = await issueIdFor(prisma, id, agent.tenantId);
    if (!bugId) throw new IssueApiError(404, "Issue not found.");
    const note = await prisma.agentSteerNote.findFirst({ where: { id: steerId, bugId, agentId: agent.agentId, bug: { projectId: scope.projectId } } });
    if (!note) throw new IssueApiError(404, "Steer note not found for this agent and issue.");
    if (note.acknowledgedAt) throw new IssueApiError(409, "This steer note has already been acknowledged.");
    const acknowledgedAt = new Date();
    const updated = await prisma.agentSteerNote.update({ where: { id: note.id }, data: { plan: parsed.data.plan, acknowledgedAt } });
    return NextResponse.json({ steer_id: updated.id, acknowledged: true, plan: updated.plan, acknowledged_at: acknowledgedAt.toISOString() });
  }, { budget: "write" });
}

const methodNotAllowed = createMethodNotAllowed(["POST", "OPTIONS"]);
const options = createOptions(["POST", "OPTIONS"]);
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = options;
