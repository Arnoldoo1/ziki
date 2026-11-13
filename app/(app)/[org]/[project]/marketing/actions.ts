"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { projectLinksSchema } from "@/app/(app)/projects/validation";
import { prisma } from "@/lib/prisma";
import { marketingPath, type ProjectRef } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";

export type MarketingSiteResult = { error?: string; ok?: boolean };

const siteSchema = projectLinksSchema.pick({ siteUrl: true });

/**
 * The Marketing home's first step (#marketing-home): the website to improve the
 * marketing for. It is the project's site link, the same one Project settings
 * and the panel above the issue list set, so it has their rule: organisation
 * owners and admins only, validated the same way, recorded in the audit log.
 */
export async function saveMarketingSiteAction(
  slug: ProjectRef,
  _previous: MarketingSiteResult | undefined,
  formData: FormData,
): Promise<MarketingSiteResult> {
  const [org, projectSlug] = slug.split("/");
  const context = await requireProject(org, projectSlug);
  if (!context.isOrgAdmin) return { error: "Only organisation owners and admins can set the website." };

  const parsed = siteSchema.safeParse({ siteUrl: formData.get("siteUrl") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the address." };
  const siteUrl = parsed.data.siteUrl;
  if (!siteUrl) return { error: "Enter your website's address." };

  const project = await prisma.project.findUnique({ where: { id: context.project.id }, select: { siteUrl: true } });
  if (project?.siteUrl !== siteUrl) {
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: context.project.id }, data: { siteUrl } });
      await tx.projectAuditEvent.create({
        data: {
          organisationId: context.organisationId,
          projectId: context.project.id,
          actorUserId: context.user.id,
          action: "settings.updated",
          changes: { siteUrl: { from: project?.siteUrl ?? null, to: siteUrl } } as Prisma.InputJsonValue,
        },
      });
    });
  }
  revalidatePath(marketingPath(slug));
  return { ok: true };
}
