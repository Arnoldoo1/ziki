"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor } from "@/lib/tenant-context";
import { issueIdFor } from "@/lib/issue-ref";

const noteSchema = z.string().trim().min(1).max(1000);

/** Send a durable steer to the agent holding an issue (#236). */
export async function sendAgentSteerAction(issueRef: unknown, body: unknown) {
  if (typeof issueRef !== "string" || issueRef.length > 191) return { ok: false as const, error: "Invalid issue." };
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, error: "Write a steer note of up to 1,000 characters." };
  const user = await requireUser();
  const tenantId = await currentTenantIdFor(user.id);
  if (!tenantId) return { ok: false as const, error: "Choose a workspace first." };
  const bugId = await issueIdFor(prisma, issueRef, tenantId);
  if (!bugId) return { ok: false as const, error: "Issue not found." };

  const result = await prisma.$transaction(async (tx) => {
    const bug = await tx.bug.findFirst({
      where: { id: bugId, tenantId, isDeleted: false },
      select: { id: true, reporterId: true, projectId: true },
    });
    if (!bug) return { error: "Issue not found." } as const;
    const claim = await tx.issueClaim.findFirst({
      where: { bugId, releasedAt: null, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true, agentId: true, agent: { select: { ownerUserId: true, revokedAt: true } } },
    });
    if (!claim || claim.agent.revokedAt) return { error: "There is no active agent claim to steer." } as const;
    const membership = await tx.membership.findFirst({
      where: { tenantId, userId: user.id }, select: { role: true },
    });
    const maySteer = claim.agent.ownerUserId === user.id || bug.reporterId === user.id || membership?.role === "admin" || membership?.role === "owner";
    if (!maySteer) return { error: "Only the agent owner, issue reporter, or project maintainers can steer this agent." } as const;
    const note = await tx.agentSteerNote.create({ data: {
      bugId, agentId: claim.agentId, authorId: user.id, body: parsed.data,
    } });
    await tx.agentInboxItem.create({ data: {
      agentId: claim.agentId, kind: "steer_note", eventType: "agent.steer_note", bugId,
      payload: { steerId: note.id, note: note.body, issueId: bugId },
    } });
    return { noteId: note.id } as const;
  });
  if ("error" in result) return { ok: false as const, error: result.error };
  revalidatePath(`/issues/${bugId}`);
  return { ok: true as const, noteId: result.noteId };
}
