import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { EpicPanel } from "./epic-panel";

export async function IssueEpic({ bugId, canEdit }: { bugId: string; canEdit: boolean }) {
  const user = await requireUser();

  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: {
      id: true,
      isEpic: true,
      parent: { select: { id: true, number: true, title: true } },
      children: {
        orderBy: [{ number: "asc" }],
        select: { id: true, number: true, title: true, status: true },
      },
    },
  });
  if (!bug) return null;

  return (
    <EpicPanel
      bugId={bugId}
      canEdit={canEdit}
      isEpic={bug.isEpic}
      parent={bug.parent ? { id: bug.parent.id, number: bug.parent.number, title: bug.parent.title } : null}
      subIssues={bug.children.map((child) => ({
        id: child.id,
        number: child.number,
        title: child.title,
        status: String(child.status),
      }))}
    />
  );
}
