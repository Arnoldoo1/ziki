"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { prisma } from "@/lib/prisma";
import { findingPrice } from "@/lib/security-checks/payment";
import { issuePath } from "@/lib/issue-ref";
import { refOf } from "@/lib/project-paths";
import { SECURITY_SEVERITIES } from "@/lib/security-severity";
import { isSuperAdmin } from "@/lib/roles";
import { fixCheckId, fixSelection, listFixProjects, sendCheckFindings, type FixOutcome } from "@/lib/security-checks/fix";

async function currentClient() {
  const user = await requireUser();
  const access = await currentOrganisationAccess(user.id, user.role);
  if (!access.organisationId || !access.membershipRole) return null;
  return { userId: user.id, organisationId: access.organisationId, superAdmin: isSuperAdmin(user.role) };
}

export async function loadSecurityCheckFixOptions(checkId: string) {
  const parsed = fixCheckId.safeParse(checkId);
  if (!parsed.success) return null;
  const client = await currentClient();
  if (!client) return null;
  return listFixProjects(client, parsed.data);
}

export async function fixSecurityCheck(input: unknown): Promise<FixOutcome> {
  const selection = fixSelection.safeParse(input);
  if (!selection.success) return { ok: false, error: "Choose findings and a destination project." };
  const client = await currentClient();
  if (!client) return { ok: false, error: "Open your workspace before sending findings." };

  let outcome: FixOutcome;
  try {
    outcome = await sendCheckFindings(client, selection.data);
  } catch {
    // Database errors may include private report context. Return a safe message.
    return { ok: false, error: "Could not send the findings. Try again." };
  }
  if (outcome.ok) {
    revalidatePath("/security");
    const reportPath = `/security/checks/${encodeURIComponent(selection.data.checkId)}`;
    revalidatePath(reportPath);
    revalidatePath(`${reportPath}/fix`);
    revalidatePath("/[org]/[project]", "layout");
  }
  return outcome;
}

export async function loadMovePage(checkId: string) {
  const parsed = fixCheckId.safeParse(checkId);
  if (!parsed.success) return null;
  const client = await currentClient();
  if (!client) return null;
  const check = await prisma.securityCheck.findFirst({
    where: { id: parsed.data, organisationId: client.organisationId, requestedById: client.userId },
    select: { postedAt: true, target: { select: { value: true } } },
  });
  if (!check) return null;
  const results = check.postedAt ? await prisma.securityCheckResult.findMany({
    where: { checkId: parsed.data },
    select: {
      id: true, severity: true, title: true, priceCoins: true, unlockedAt: true, findingId: true,
      finding: { select: { bug: { select: {
        number: true, project: { select: { slug: true, organisation: { select: { slug: true } } } },
      } } } },
    },
    orderBy: { id: "asc" },
  }) : [];
  return {
    asset: check.target.value,
    posted: Boolean(check.postedAt),
    results: results.sort((a, b) => SECURITY_SEVERITIES.indexOf(a.severity) - SECURITY_SEVERITIES.indexOf(b.severity))
      .map((result) => {
        const issue = result.finding?.bug;
        return {
          id: result.id, severity: result.severity, title: result.title,
          price: result.unlockedAt || result.findingId ? 0 : findingPrice(result),
          moved: Boolean(result.findingId),
          issue: issue && { number: issue.number, href: issuePath(refOf(issue.project), issue.number) },
        };
      }),
  };
}
