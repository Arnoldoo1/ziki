import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tenant membership (#425): reports are filed into the reporter's tenant,
 * someone with no membership can't file at all, an area from another project
 * is refused, and an issue in another tenant is "not found".
 */

vi.mock("@/lib/tenant-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tenant-context")>()),
  currentTenantIdFor: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyLater: vi.fn() }));
vi.mock("@/lib/agent-api/web-events", () => ({ publishWebEvent: vi.fn() }));
vi.mock("@/lib/session-user", () => ({ resolveSessionUserId: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/tenant-access", () => ({
  currentTenantAccess: vi.fn(async () => ({
    tenantId: "tenant-zedu",
    tenantName: "Zedu",
    tenantSlug: "zedu",
    membershipRole: "member",
    admin: false,
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bug: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    comment: { create: vi.fn() },
    bugActivity: { create: vi.fn() },
    attachment: { updateMany: vi.fn() },
    issueWatch: { createMany: vi.fn() },
    idea: { create: vi.fn() },
    // #project-urls: the form names its project; only one in the reporter's tenant is used.
    project: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        where.id === "project-zedu" && where.tenantId === "tenant-zedu" ? { id: "project-zedu", slug: "zedu" } : null),
    },
    projectArea: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { currentTenantIdFor, NO_TENANT_MESSAGE } from "@/lib/tenant-context";
import { createBugAction, requestRetestAction, updateBugAction } from "@/app/actions/issues";

const db = prisma as unknown as {
  bug: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  comment: { create: ReturnType<typeof vi.fn> };
  bugActivity: { create: ReturnType<typeof vi.fn> };
  attachment: { updateMany: ReturnType<typeof vi.fn> };
  issueWatch: { createMany: ReturnType<typeof vi.fn> };
  idea: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  projectArea: { findFirst: ReturnType<typeof vi.fn> };
  $executeRaw: ReturnType<typeof vi.fn>;
};
const tenantOf = currentTenantIdFor as unknown as ReturnType<typeof vi.fn>;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const report = form({
  title: "Login button does nothing",
  description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
  proofLinks: "",
  projectId: "project-zedu",
});

describe("issue actions are tenant-scoped (#425)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", role: "user" });
    db.$transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run(prisma));
  });

  it("refuses to file a report for someone with no membership", async () => {
    tenantOf.mockResolvedValue(null);
    expect(await createBugAction(report)).toEqual({ error: NO_TENANT_MESSAGE });
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("files the report, as an idea, into the reporter's tenant and project", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.idea.create.mockRejectedValue(new Error("stop after create"));
    await createBugAction(report).catch(() => undefined);
    expect(db.idea.create).toHaveBeenCalledTimes(1);
    expect(db.idea.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "tenant-zedu",
      projectId: "project-zedu",
      beneficiaryUserId: "user-1",
    });
  });

  it("refuses a project from another tenant", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    const result = await createBugAction(form({
      title: "Login button does nothing",
      description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
      proofLinks: "",
      projectId: "project-acme",
    }));
    expect(result).toEqual({ error: NO_TENANT_MESSAGE });
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("rejects an area from another project before saving", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.projectArea.findFirst.mockResolvedValue(null);
    const result = await createBugAction(form({
      title: "Login button does nothing",
      description: "Clicking Login on the sign-in page does nothing at all, on Chrome and Firefox.",
      proofLinks: "",
      projectId: "project-zedu",
      areaId: "foreign-area",
    }));
    expect(result).toMatchObject({ error: expect.any(String), field: "areaId" });
    expect(db.idea.create).not.toHaveBeenCalled();
  });

  it("treats an issue in another tenant as not found", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    db.bug.findUnique.mockResolvedValue(null);
    expect(await updateBugAction("bug-in-acme", form({ status: "resolved" }))).toEqual({
      error: expect.any(String),
    });
    expect(db.bug.findUnique.mock.calls[0][0].where).toEqual({ id: "bug-in-acme", tenantId: "tenant-zedu" });
  });

  it("refuses a retest request unless the original issue is Live, without changing it", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    vi.mocked((await import("@/lib/session-user")).resolveSessionUserId).mockResolvedValue({ userId: "user-1" });
    db.bug.findUnique.mockResolvedValue({ id: "bug-1", status: "in_progress", isDeleted: false });
    const request = form({
      operatingSystem: "Windows",
      installedVersion: "",
      currentBehavior: "The same issue still happens after restarting.",
    });

    await expect(requestRetestAction("bug-1", request)).resolves.toMatchObject({ error: "Retest requests are available after an issue is Live." });
    expect(db.bug.findUnique).toHaveBeenCalledWith({
      where: { id: "bug-1", tenantId: "tenant-zedu" },
      select: { id: true, status: true, isDeleted: true },
    });
    expect(db.bug.update).not.toHaveBeenCalled();
  });

  it("saves a retest on the original Live issue as a comment and leaves its status unchanged", async () => {
    tenantOf.mockResolvedValue("tenant-zedu");
    vi.mocked((await import("@/lib/session-user")).resolveSessionUserId).mockResolvedValue({ userId: "user-1" });
    const issue = { id: "bug-1", status: "resolved", isDeleted: false, title: "Save still fails", reporterId: "user-1", assigneeId: null, tenantId: "tenant-zedu", pullRequestUrl: null };
    db.bug.findUnique.mockResolvedValue(issue);
    db.comment.create.mockResolvedValue({ id: "comment123" });
    db.attachment.updateMany.mockResolvedValue({ count: 0 });
    db.bugActivity.create.mockResolvedValue({});
    db.issueWatch.createMany.mockResolvedValue({ count: 1 });
    db.bug.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => Object.assign(issue, data));
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Emmanuel" } as never);
    const request = form({
      operatingSystem: "Not sure",
      installedVersion: "",
      currentBehavior: "The save button still does nothing after I restart.",
    });

    await expect(requestRetestAction("bug-1", request)).resolves.toMatchObject({ ok: true, commentId: "comment123" });
    expect(db.comment.create.mock.calls[0][0].data).toMatchObject({
      bugId: "bug-1",
      authorId: "user-1",
      body: expect.stringContaining("Installed version: Unknown"),
    });
    expect(db.comment.create.mock.calls[0][0].data.body).toContain("The save button still does nothing after I restart.");
    expect(db.bugActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ bugId: "bug-1", type: "commented" }) }));
    expect(db.bug.update).toHaveBeenCalledWith({ where: { id: "bug-1" }, data: { updatedAt: expect.any(Date) } });
    expect(issue.status).toBe("resolved");
  });
});
