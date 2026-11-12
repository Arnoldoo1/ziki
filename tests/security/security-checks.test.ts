import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  securityCheck: { findFirst: vi.fn() },
  securityCheckResult: { findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const session = vi.hoisted(() => ({ userId: "owner", organisationId: "org1" }));
vi.mock("@/lib/auth-helpers", () => ({ requireUser: async () => ({ id: session.userId, role: "user" }) }));
vi.mock("@/lib/organisation-access", () => ({
  currentOrganisationAccess: async () => ({ organisationId: session.organisationId, admin: false }),
}));
const renderReportPdf = vi.hoisted(() => vi.fn());
vi.mock("@/components/security-checks/report-pdf", () => ({ renderReportPdf }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import { fixOf, loadCheckReport } from "@/lib/security-checks/report";
import { GET as downloadReportPdf } from "@/app/(app)/security/checks/[id]/report.pdf/route";
import {
  CHECK_STATUS_LABEL,
  ITEM_STATUS_LABEL,
  SECURITY_CHECK_ITEM_KINDS,
  SECURITY_CHECK_ITEM_STATUSES,
  SECURITY_CHECK_PRICE_COINS,
  SECURITY_CHECK_STATUSES,
  SECURITY_TARGET_KINDS,
  TARGET_KIND_LABEL,
  agentsMayWork,
  isCheckPaid,
  isSecurityCheckItemStatus,
  isSecurityCheckStatus,
  isSecurityTargetKind,
} from "@/lib/security-checks";

const enumValues = (name: string) =>
  Prisma.dmmf.datamodel.enums.find((e) => e.name === name)?.values.map((v) => v.name) ?? [];

describe("security check words (#security-checks)", () => {
  it("match the database enums exactly", () => {
    expect([...SECURITY_TARGET_KINDS].sort()).toEqual(enumValues("SecurityTargetKind").sort());
    expect([...SECURITY_CHECK_STATUSES].sort()).toEqual(enumValues("SecurityCheckStatus").sort());
    expect([...SECURITY_CHECK_ITEM_KINDS].sort()).toEqual(enumValues("SecurityCheckItemKind").sort());
    expect([...SECURITY_CHECK_ITEM_STATUSES].sort()).toEqual(enumValues("SecurityCheckItemStatus").sort());
  });

  it("label every value", () => {
    for (const kind of SECURITY_TARGET_KINDS) expect(TARGET_KIND_LABEL[kind]).toBeTruthy();
    for (const status of SECURITY_CHECK_STATUSES) expect(CHECK_STATUS_LABEL[status]).toBeTruthy();
    for (const status of SECURITY_CHECK_ITEM_STATUSES) expect(ITEM_STATUS_LABEL[status]).toBeTruthy();
  });

  it("guard unknown values", () => {
    expect(isSecurityTargetKind("repo")).toBe(true);
    expect(isSecurityTargetKind("domain")).toBe(false);
    expect(isSecurityCheckStatus("checking")).toBe(true);
    expect(isSecurityCheckStatus(1)).toBe(false);
    expect(isSecurityCheckItemStatus("done")).toBe(true);
    expect(isSecurityCheckItemStatus("finished")).toBe(false);
  });

  it("keep agents off a target until ownership is proven", () => {
    const verified = { verifiedAt: new Date() };
    expect(agentsMayWork({ status: "queued" }, { verifiedAt: null })).toBe(false);
    expect(agentsMayWork({ status: "awaiting_ownership" }, verified)).toBe(false);
    expect(agentsMayWork({ status: "queued" }, verified)).toBe(true);
    expect(agentsMayWork({ status: "checking" }, verified)).toBe(true);
    expect(agentsMayWork({ status: "done" }, verified)).toBe(false);
    expect(agentsMayWork({ status: "cancelled" }, verified)).toBe(false);
  });

  it("unlock the report only once paid", () => {
    expect(isCheckPaid({ paidAt: null })).toBe(false);
    expect(isCheckPaid({ paidAt: new Date() })).toBe(true);
    expect(SECURITY_CHECK_PRICE_COINS).toBe(50);
  });
});

describe("what a client sees of a check (#security-checks, part 4)", () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 10, 12, 9, minutes));
  function check(paidAt: Date | null) {
    return {
      id: "check1",
      status: "checking",
      paidAt,
      priceCoins: 50,
      createdAt: at(0),
      finishedAt: null,
      startedAt: at(0),
      target: { id: "t1", kind: "website", value: "shop.example.test", input: "https://shop.example.test", verifiedAt: at(0) },
      items: [
        { id: "i1", title: "Login", status: "done", agentId: "a1" },
        { id: "i2", title: "TLS", status: "skipped", agentId: "a1" },
        { id: "i3", title: "Headers", status: "checking", agentId: "a2" },
        { id: "i4", title: "CORS", status: "waiting", agentId: null },
        { id: "i5", title: "Cookies", status: "done", agentId: "a2" },
      ],
    };
  }
  const full = (id: string, severity: string, minute: number) => ({
    id, itemId: "i1", severity, title: `${id} title`, description: `${id} description`, howToFix: `${id} fix`, createdAt: at(minute), finding: null,
    item: { agent: { id: "a1", name: "Atlas Agent", avatar: null } },
  });

  beforeEach(() => {
    db.securityCheck.findFirst.mockReset();
    db.securityCheckResult.findMany.mockReset();
    db.securityCheckResult.findUnique.mockReset();
    renderReportPdf.mockReset();
    session.userId = "owner";
  });

  it("is the requester's alone: another person, even in the same workspace, gets nothing", async () => {
    db.securityCheck.findFirst.mockResolvedValue(null);
    expect(await loadCheckReport("check1", "org1", "teammate")).toBeNull();
    expect(db.securityCheck.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "check1", organisationId: "org1", requestedById: "teammate" } }),
    );
    expect(db.securityCheckResult.findMany).not.toHaveBeenCalled();
  });

  it("unpaid: shows the worst problem without its fix, and never reads the hidden ones' text", async () => {
    db.securityCheck.findFirst.mockResolvedValue(check(null));
    db.securityCheckResult.findMany.mockResolvedValue([
      { id: "low", itemId: "i1", severity: "low", createdAt: at(1) },
      { id: "crit", itemId: "i1", severity: "critical", createdAt: at(2) },
      { id: "high", itemId: "i1", severity: "high", createdAt: at(3) },
    ]);
    db.securityCheckResult.findUnique.mockResolvedValue({
      id: "crit", severity: "critical", title: "crit title", description: "crit description", item: { agent: { id: "a1", name: "Atlas Agent", avatar: null } },
    });

    const report = await loadCheckReport("check1", "org1", "owner");

    // The list query reads no text at all, and the teaser query never reads how to fix.
    const listSelect = db.securityCheckResult.findMany.mock.calls[0][0].select;
    expect(Object.keys(listSelect).sort()).toEqual(["createdAt", "id", "itemId", "severity"]);
    const teaserQuery = db.securityCheckResult.findUnique.mock.calls[0][0];
    expect(teaserQuery.where).toEqual({ id: "crit" });
    expect(teaserQuery.select).not.toHaveProperty("howToFix");

    expect(report).toMatchObject({ paid: false, total: 3, hiddenCount: 2, teaser: { id: "crit", agent: { id: "a1", name: "Atlas Agent", avatar: null } } });
    expect(report).not.toHaveProperty("results");
    expect(report?.counts).toEqual({ critical: 1, high: 1, medium: 0, low: 1 });
    // A skipped part counts as finished (3 of 5); a finished part that found nothing is clear.
    expect(report?.progress).toEqual({ done: 3, total: 5, percent: 60 });
    expect(report?.clearParts).toEqual(["Cookies"]);
    expect(report?.agentCount).toBe(2);
  });

  it("unpaid with no critical: the teaser is the worst problem found", async () => {
    db.securityCheck.findFirst.mockResolvedValue(check(null));
    db.securityCheckResult.findMany.mockResolvedValue([
      { id: "medium", itemId: "i1", severity: "medium", createdAt: at(1) },
      { id: "high", itemId: "i5", severity: "high", createdAt: at(2) },
    ]);
    db.securityCheckResult.findUnique.mockResolvedValue({ id: "high", severity: "high", title: "t", description: "d", item: { agent: null } });

    await loadCheckReport("check1", "org1", "owner");

    expect(db.securityCheckResult.findUnique.mock.calls[0][0].where).toEqual({ id: "high" });
  });

  it("paid: every problem, worst first, with how to fix", async () => {
    db.securityCheck.findFirst.mockResolvedValue(check(at(5)));
    db.securityCheckResult.findMany.mockResolvedValue([full("low", "low", 1), full("crit", "critical", 2), full("high-late", "high", 4), full("high", "high", 3)]);

    const report = await loadCheckReport("check1", "org1", "owner");

    expect(report?.paid).toBe(true);
    if (!report?.paid) throw new Error("expected a paid report");
    expect(report.results.map((r) => r.id)).toEqual(["crit", "high", "high-late", "low"]);
    expect(report.results[0]).toMatchObject({ howToFix: "crit fix", agent: { name: "Atlas Agent" } });
    expect(db.securityCheckResult.findUnique).not.toHaveBeenCalled();
  });

  it("PDF: an unpaid check is sent to pay and no PDF is made; a stranger gets 404", async () => {
    const params = { params: Promise.resolve({ id: "check1" }) };
    db.securityCheck.findFirst.mockResolvedValue(check(null));
    db.securityCheckResult.findMany.mockResolvedValue([]);

    await expect(downloadReportPdf(new Request("http://localhost/x"), params)).rejects.toThrow("redirect:/security/checks/check1/pay");
    expect(renderReportPdf).not.toHaveBeenCalled();

    session.userId = "stranger";
    db.securityCheck.findFirst.mockResolvedValue(null);
    const response = await downloadReportPdf(new Request("http://localhost/x"), params);
    expect(response.status).toBe(404);
    expect(renderReportPdf).not.toHaveBeenCalled();
  });

  it("a sent problem's fix follows its finding: Live is fixed, a deleted issue doesn't count, a rejected idea is closed", () => {
    const project = { slug: "web", organisation: { slug: "ziki" } };
    const finding = (bug: object | null, idea: object | null = null, verifications: object[] = []) =>
      fixOf({ id: "f1", project, bug, idea, verifications } as never);
    const bug = (status: string, substatus: string, isDeleted = false) => ({ number: 912, status, substatus, pullRequestUrl: null, isDeleted });

    expect(fixOf(null)).toBeNull();
    expect(finding(bug("in_progress", "in_progress"))).toMatchObject({
      bucket: "fixing", substatus: "in_progress", issue: { number: 912 }, findingHref: "/security/findings/f1",
    });
    expect(finding(bug("resolved", "on_prod"), null, [{ passed: true, reviewer: { name: "Hana" } }])).toMatchObject({
      bucket: "fixed", recheck: { passed: true, by: "Hana" },
    });
    // A deleted issue falls back to its idea's stage.
    expect(finding(bug("resolved", "on_prod", true), { status: "open", isDeleted: false })).toMatchObject({
      bucket: "fixing", issue: null, stageLabel: "Waiting for verdicts",
    });
    expect(finding(null, { status: "rejected", isDeleted: false })).toMatchObject({ bucket: "closed", stageLabel: "Rejected" });
  });
});
