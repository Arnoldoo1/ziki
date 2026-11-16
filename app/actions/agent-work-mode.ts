"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { activeLevels, isActiveIn, levelIn } from "@/lib/agents/active-in";
import { audit } from "@/lib/agents/audit";
import { parseWorkSettings, workSettingsData } from "@/lib/agents/work-mode";
import { acceptOffer } from "@/lib/agent-api/offer";
import { IssueApiError } from "@/lib/agent-api/errors";
import { revalidateIssue } from "@/lib/revalidate-issue";

export type WorkModeActionResult = { ok: true } | { ok: false; error: string; field?: string };

/**
 * The owner changes how their agent works and its caps (#agent-work-mode).
 * Only the owner: the caps limit what is spent on their behalf.
 */
export async function setAgentWorkModeAction(
  _previous: WorkModeActionResult | undefined,
  formData: FormData,
): Promise<WorkModeActionResult> {
  const user = await requireUser();
  const agentId = String(formData.get("agentId") ?? "");
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, ownerUserId: user.id, revokedAt: null },
    select: { id: true, username: true, activations: { where: { deactivatedAt: null }, select: { organisationId: true }, take: 1 } },
  });
  if (!agent) return { ok: false, error: "Only its owner can change how this agent works." };
  const parsed = parseWorkSettings(formData);
  if (!parsed.ok) return parsed;
  await prisma.agent.update({ where: { id: agent.id }, data: workSettingsData(parsed.settings) });
  const organisationId = agent.activations[0]?.organisationId;
  if (organisationId) {
    await audit({ agentId: agent.id, organisationId }, "agent.work_mode_set", `agent:${agent.id}`, { ...parsed.settings }, { actorUserId: user.id });
  }
  revalidatePath(`/agent/${agent.username}/edit/work-mode`);
  return { ok: true };
}

export type ApproveOfferResult = { ok: true } | { ok: false; error: string };

/**
 * Ask me first (#agent-work-mode): the owner's one-tap yes. Their agent won a
 * bid, and the offer becomes its claim exactly as if the agent had accepted
 * it. Only the agent's owner can say yes; the caps don't hold back their own
 * decision.
 */
export async function approveAgentOfferAction(
  _previous: ApproveOfferResult | undefined,
  formData: FormData,
): Promise<ApproveOfferResult> {
  const user = await requireUser();
  const claimId = String(formData.get("claimId") ?? "");
  const claim = await prisma.issueClaim.findUnique({
    where: { id: claimId },
    select: {
      status: true,
      bug: { select: { organisationId: true } },
      agent: { select: { id: true, name: true, ownerUserId: true, revokedAt: true, pausedAt: true, activations: activeLevels } },
    },
  });
  if (!claim || claim.agent.ownerUserId !== user.id || claim.agent.revokedAt) {
    return { ok: false, error: "That offer isn't waiting for your yes." };
  }
  if (claim.status !== "offered") return { ok: false, error: "That offer is no longer open." };
  const organisationId = claim.bug.organisationId;
  if (!isActiveIn(claim.agent, organisationId)) {
    return { ok: false, error: `${claim.agent.name} isn't active in this organisation any more.` };
  }
  try {
    await acceptOffer(
      {
        agentId: claim.agent.id,
        name: claim.agent.name,
        ownerId: user.id,
        organisationId,
        level: levelIn(claim.agent, organisationId),
        burst: false,
        pausedAt: claim.agent.pausedAt,
        keyId: "web",
      },
      claimId,
      { byOwner: true },
    );
  } catch (error) {
    if (error instanceof IssueApiError) return { ok: false, error: error.message };
    console.error("[work-mode] owner approval failed", error);
    return { ok: false, error: "Could not accept that offer. Try again." };
  }
  await audit({ agentId: claim.agent.id, organisationId }, "claims.owner_approved", `claim:${claimId}`, null, { actorUserId: user.id });
  revalidateIssue();
  return { ok: true };
}
