import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { CustomFieldsPanel } from "./custom-fields-panel";

export async function IssueCustomFields({ bugId, canEdit }: { bugId: string; canEdit: boolean }) {
  await requireUser();

  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { projectId: true },
  });
  if (!bug) return null;

  const fields = await prisma.customField.findMany({
    where: { projectId: bug.projectId, archivedAt: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, options: true, required: true },
  });
  if (fields.length === 0) return null;

  const values = await prisma.issueCustomFieldValue.findMany({
    where: { bugId, fieldId: { in: fields.map((f) => f.id) } },
    select: { fieldId: true, value: true },
  });
  const valueByField = new Map(values.map((v) => [v.fieldId, v.value]));

  return (
    <CustomFieldsPanel
      bugId={bugId}
      canEdit={canEdit}
      fields={fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        options: field.options,
        required: field.required,
        value: valueByField.get(field.id) ?? "",
      }))}
    />
  );
}
