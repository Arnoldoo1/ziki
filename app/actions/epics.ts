"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { bugInOrganisation, currentOrganisationIdFor } from "@/lib/organisation-context";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { parseIssueRef } from "@/lib/duplicates";
import { formatIssueNumber } from "@/lib/issue-number";
import { revalidateIssue } from "@/lib/revalidate-issue";
import { wouldCreateHierarchyCycle } from "@/lib/epics";

export type EpicActionResult = { ok?: true; error?: string };

const FORBIDDEN = "Only an owner or admin of this organization can change issue hierarchy.";

async function requireOrgAdmin() {
  const user = await requireUser();
  const access = await currentOrganisationAccess(user.id, user.role);
  return access.admin ? { user } : { error: FORBIDDEN };
}

function revalidate() {
  revalidateIssue();
  revalidatePath("/[project]", "layout");
}

/** Mark or unmark an issue as an epic. */
export async function setEpicAction(bugId: string, isEpic: boolean): Promise<EpicActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const bug = await prisma.bug.findFirst({
    where: { id: bugId, ...bugInOrganisation(organisationId), isDeleted: false },
    select: { id: true, number: true, _count: { select: { children: true } } },
  });
  if (!bug) return { error: "This issue no longer exists or was deleted." };
  if (!isEpic && bug._count.children > 0) {
    return { error: "Remove the sub-issues first, then unmark this epic." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bug.update({ where: { id: bug.id }, data: { isEpic } });
      await tx.bugActivity.create({
        data: {
          bugId: bug.id,
          actorId: gate.user.id,
          type: "commented",
          summary: isEpic ? "marked this issue as an epic" : "unmarked this issue as an epic",
          metadata: { field: "isEpic", isEpic },
        },
      });
    });
  } catch (error) {
    console.error("Failed to update epic flag:", error);
    return { error: "Failed to update the epic flag." };
  }
  revalidate();
  return { ok: true };
}

/** Nest an issue under an epic. The parent is marked as an epic if needed. */
export async function addSubIssueAction(parentBugId: string, childRef: string): Promise<EpicActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const parent = await prisma.bug.findFirst({
    where: { id: parentBugId, ...bugInOrganisation(organisationId), isDeleted: false },
    select: { id: true, number: true, projectId: true },
  });
  if (!parent) return { error: "This issue no longer exists or was deleted." };

  const ref = parseIssueRef(childRef ?? "");
  if (!ref) return { error: "Enter an issue number, like #12." };

  const child = await prisma.bug.findFirst({
    where: { ...bugInOrganisation(organisationId), isDeleted: false, ...("number" in ref ? { number: ref.number } : { id: ref.id }) },
    select: { id: true, number: true, projectId: true, parentId: true },
  });
  if (!child) return { error: "That issue doesn't exist or was deleted." };
  if (child.id === parent.id) return { error: "An issue can't be a sub-issue of itself." };
  if (child.projectId !== parent.projectId) return { error: "Choose an issue from the same project." };
  if (child.parentId === parent.id) return { ok: true };

  if (await wouldCreateHierarchyCycle(child.id, parent.id, async (issueIds) => {
    const rows = await prisma.bug.findMany({
      where: { id: { in: issueIds }, projectId: parent.projectId },
      select: { parentId: true },
    });
    return rows.map((row) => row.parentId).filter((id): id is string => Boolean(id));
  })) return { error: "That link would create a hierarchy cycle." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bug.update({ where: { id: parent.id }, data: { isEpic: true } });
      await tx.bug.update({ where: { id: child.id }, data: { parentId: parent.id } });
      await tx.bugActivity.createMany({ data: [
        { bugId: parent.id, actorId: gate.user.id, type: "commented", summary: `added ${formatIssueNumber(child.number)} as a sub-issue`, metadata: { field: "children", childId: child.id, childNumber: child.number } },
        { bugId: child.id, actorId: gate.user.id, type: "commented", summary: `nested this issue under ${formatIssueNumber(parent.number)}`, metadata: { field: "parent", parentId: parent.id, parentNumber: parent.number } },
      ] });
    });
  } catch (error) {
    console.error("Failed to nest sub-issue:", error);
    return { error: "Failed to nest the sub-issue." };
  }
  revalidate();
  return { ok: true };
}

/** Remove a sub-issue from an epic. */
export async function removeSubIssueAction(parentBugId: string, childBugId: string): Promise<EpicActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const parent = await prisma.bug.findFirst({
    where: { id: parentBugId, ...bugInOrganisation(organisationId), isDeleted: false },
    select: { id: true, number: true },
  });
  const child = await prisma.bug.findFirst({
    where: { id: childBugId, ...bugInOrganisation(organisationId), isDeleted: false },
    select: { id: true, number: true, parentId: true },
  });
  if (!parent || !child) return { error: "This issue no longer exists or was deleted." };
  if (child.parentId !== parent.id) return { ok: true };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bug.update({ where: { id: child.id }, data: { parentId: null } });
      await tx.bugActivity.createMany({ data: [
        { bugId: parent.id, actorId: gate.user.id, type: "commented", summary: `removed ${formatIssueNumber(child.number)} from this epic`, metadata: { field: "children", childId: child.id } },
        { bugId: child.id, actorId: gate.user.id, type: "commented", summary: `removed from epic ${formatIssueNumber(parent.number)}`, metadata: { field: "parent", parentId: parent.id } },
      ] });
    });
  } catch (error) {
    console.error("Failed to remove sub-issue:", error);
    return { error: "Failed to remove the sub-issue." };
  }
  revalidate();
  return { ok: true };
}
