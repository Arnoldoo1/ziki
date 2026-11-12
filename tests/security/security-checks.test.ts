import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  CHECK_STATUS_LABEL,
  ITEM_STATUS_LABEL,
  SECURITY_CHECK_ITEM_KINDS,
  SECURITY_CHECK_ITEM_STATUSES,
  SECURITY_CHECK_PRICE_COINS,
  SECURITY_CHECK_STATUSES,
  SECURITY_TARGET_KINDS,
  TARGET_KIND_LABEL,
  FREE_SCANS_PER_TARGET,
  FREE_SCANS_PER_WORKSPACE_PER_MONTH,
  ON_CALL_INVITE_STATUSES,
  ON_CALL_QUIET_AFTER_MS,
  SEVERITY_PRICE,
  agentsMayWork,
  freeScanAllowed,
  freeScanMonthStart,
  isCheckPaid,
  isQuiet,
  isResultUnlocked,
  isSecurityCleared,
  unlockTotal,
  isReportPosted,
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

  it("show results only once the collated report is posted", () => {
    expect(isReportPosted({ postedAt: null })).toBe(false);
    expect(isReportPosted({ postedAt: new Date() })).toBe(true);
  });

  it("unlock the report only once paid", () => {
    expect(isCheckPaid({ paidAt: null })).toBe(false);
    expect(isCheckPaid({ paidAt: new Date() })).toBe(true);
    expect(SECURITY_CHECK_PRICE_COINS).toBe(50);
  });
});

describe("the 12 Nov plan's rules (#security-checks, #on-call)", () => {
  it("prices a finding by severity, worst costs most", () => {
    expect(SEVERITY_PRICE).toEqual({ critical: 5, high: 3, medium: 2, low: 1 });
    expect(unlockTotal([
      { severity: "critical", priceCoins: 5 },
      { severity: "high", priceCoins: null },
      { severity: "low", priceCoins: 1 },
    ])).toBe(9);
    expect(unlockTotal([])).toBe(0);
  });

  it("shows a finding's details only once it is unlocked", () => {
    expect(isResultUnlocked({ unlockedAt: null })).toBe(false);
    expect(isResultUnlocked({ unlockedAt: new Date() })).toBe(true);
  });

  it("allows one free scan per target and a few per workspace a month", () => {
    expect(freeScanAllowed({ targetFreeScans: 0, workspaceFreeScansThisMonth: 0 })).toEqual({ allowed: true });
    expect(freeScanAllowed({ targetFreeScans: FREE_SCANS_PER_TARGET, workspaceFreeScansThisMonth: 0 })).toEqual({ allowed: false, reason: "target_used" });
    expect(freeScanAllowed({ targetFreeScans: 0, workspaceFreeScansThisMonth: FREE_SCANS_PER_WORKSPACE_PER_MONTH })).toEqual({ allowed: false, reason: "workspace_limit" });
    expect(freeScanMonthStart(new Date("2026-11-30T23:59:00Z"))).toEqual(new Date("2026-11-01T00:00:00Z"));
  });

  it("flags an on-call agent as quiet after 15 minutes unseen, or when never seen", () => {
    const now = new Date("2026-11-12T20:00:00Z");
    expect(isQuiet(null, now)).toBe(true);
    expect(isQuiet(new Date(now.getTime() - ON_CALL_QUIET_AFTER_MS + 1000), now)).toBe(false);
    expect(isQuiet(new Date(now.getTime() - ON_CALL_QUIET_AFTER_MS), now)).toBe(true);
  });

  it("gives security work only to cleared agents", () => {
    expect(isSecurityCleared({ securityClearedAt: null })).toBe(false);
    expect(isSecurityCleared({ securityClearedAt: new Date() })).toBe(true);
  });

  it("lists every on-call invite status the database has", () => {
    expect([...ON_CALL_INVITE_STATUSES].sort()).toEqual(enumValues("OnCallInviteStatus").sort());
  });
});
