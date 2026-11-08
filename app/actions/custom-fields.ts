"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { bugInOrganisation, currentOrganisationIdFor } from "@/lib/organisation-context";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { revalidateIssue } from "@/lib/revalidate-issue";
import {
  validateCustomFieldDefinition,
  validateCustomFieldValue,
  type CustomFieldType,
} from "@/lib/custom-fields";

export type CustomFieldActionResult = { ok?: true; error?: string; fieldId?: string };

function revalidate() {
  revalidateIssue();
  revalidatePath("/[project]", "layout");
}

async function requireOrgAdmin() {
  const user = await requireUser();
  const access = await currentOrganisationAccess(user.id, user.role);
  return access.admin ? { user } : { error: "Only an owner or admin of this organization can manage custom fields." };
}

/** Create a new custom field on a project. */
export async function createCustomFieldAction(
  projectId: string,
  input: { name: string; type: string; options: string[]; required: boolean },
): Promise<CustomFieldActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const project = await prisma.project.findFirst({
    where: { id: projectId, organisationId },
    select: { id: true },
  });
  if (!project) return { error: "That project doesn't exist." };

  const validated = validateCustomFieldDefinition({
    name: input.name,
    type: input.type,
    options: input.options,
    required: input.required,
  });
  if (!validated.ok) return { error: validated.error };

  const last = await prisma.customField.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    const field = await prisma.customField.create({
      data: {
        projectId,
        name: validated.name,
        type: validated.type,
        options: validated.options,
        required: validated.required,
        position: (last?.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return { ok: true, fieldId: field.id };
  } catch (error) {
    console.error("Failed to create custom field:", error);
    return { error: "A field with that name already exists." };
  }
}

/** Update an existing custom field. */
export async function updateCustomFieldAction(
  fieldId: string,
  input: { name: string; type: string; options: string[]; required: boolean },
): Promise<CustomFieldActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const field = await prisma.customField.findFirst({
    where: { id: fieldId, project: { organisationId } },
    select: { id: true },
  });
  if (!field) return { error: "That field doesn't exist." };

  const validated = validateCustomFieldDefinition({
    name: input.name,
    type: input.type,
    options: input.options,
    required: input.required,
  });
  if (!validated.ok) return { error: validated.error };

  try {
    await prisma.customField.update({
      where: { id: field.id },
      data: {
        name: validated.name,
        type: validated.type,
        options: validated.options,
        required: validated.required,
      },
    });
  } catch (error) {
    console.error("Failed to update custom field:", error);
    return { error: "A field with that name already exists." };
  }
  revalidate();
  return { ok: true };
}

/** Archive (soft-delete) a custom field. */
export async function archiveCustomFieldAction(fieldId: string): Promise<CustomFieldActionResult> {
  const gate = await requireOrgAdmin();
  if ("error" in gate) return { error: gate.error };
  const organisationId = await currentOrganisationIdFor(gate.user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const field = await prisma.customField.findFirst({
    where: { id: fieldId, project: { organisationId } },
    select: { id: true },
  });
  if (!field) return { ok: true };

  await prisma.customField.update({
    where: { id: field.id },
    data: { archivedAt: new Date() },
  });
  revalidate();
  return { ok: true };
}

/** Save the custom field values for an issue. */
export async function setIssueCustomFieldsAction(
  bugId: string,
  values: Record<string, string>,
): Promise<CustomFieldActionResult> {
  const user = await requireUser();
  const access = await currentOrganisationAccess(user.id, user.role);
  const organisationId = await currentOrganisationIdFor(user.id);
  if (!organisationId) return { error: "Select an organization first." };

  const bug = await prisma.bug.findFirst({
    where: { id: bugId, ...bugInOrganisation(organisationId), isDeleted: false },
    select: { id: true, assigneeId: true, projectId: true },
  });
  if (!bug) return { error: "This issue no longer exists or was deleted." };
  if (!access.admin && bug.assigneeId !== user.id) {
    return { error: "Only the assignee or an admin can edit custom fields." };
  }

  const fields = await prisma.customField.findMany({
    where: { projectId: bug.projectId, archivedAt: null },
    select: { id: true, type: true, options: true, required: true },
  });

  // Validate all values first.
  const validated: { fieldId: string; value: string }[] = [];
  for (const field of fields) {
    const raw = Object.prototype.hasOwnProperty.call(values, field.id) ? values[field.id] : "";
    const result = validateCustomFieldValue(
      { type: field.type as CustomFieldType, options: field.options, required: field.required },
      raw,
    );
    if (!result.ok) return { error: result.error };
    validated.push({ fieldId: field.id, value: result.value });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const { fieldId, value } of validated) {
        if (value === "") {
          await tx.issueCustomFieldValue.deleteMany({ where: { fieldId, bugId } });
        } else {
          await tx.issueCustomFieldValue.upsert({
            where: { fieldId_bugId: { fieldId, bugId } },
            create: { fieldId, bugId, value },
            update: { value },
          });
        }
      }
      await tx.bugActivity.create({
        data: {
          bugId: bug.id,
          actorId: user.id,
          type: "commented",
          summary: "updated custom field values",
          metadata: { field: "customFields" },
        },
      });
    });
  } catch (error) {
    console.error("Failed to save custom fields:", error);
    return { error: "Failed to save custom fields." };
  }

  revalidate();
  return { ok: true };
}
