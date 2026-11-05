import { describe, expect, it, vi } from "vitest";

// #pr-reports: whether a pull request was closed without merging is the latest
// agent report on it; Ziki never asks GitHub.
/** Retries never pay or debit twice (#428, #450, #622): every award has one source key, and a correction is written once. */
const reports = vi.hoisted(() => ({
  reportedClosedUnmerged: vi.fn(async (_bugId: string, url?: string | null) => url?.includes("closed") ?? false),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/agent-api/pull-request-report", () => ({
  reportedClosedUnmerged: reports.reportedClosedUnmerged,
}));

import { award, awardDispatcher, solverAward } from "@/lib/points/award";
import { correct } from "@/lib/points/correct";
import { DAILY_SELL_LIMIT_ZIKI, quoteSwap, swapProblem } from "@/lib/wallet/rules";

/** An in-memory ledger with the unique `sourceKey` the database enforces. */
function fakeLedger() {
  const rows: Array<Record<string, unknown>> = [];
  const createMany = vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
    let count = 0;
    for (const row of data) {
      if (rows.some((r) => r.sourceKey === row.sourceKey)) continue;
      rows.push(row);
      count++;
    }
    return { count };
  });
  return { rows, db: { pointEntry: { createMany } } as never, createMany };
}

const issue = { id: "bug-1", tenantId: "tenant-zedu", assigneeId: "user-1" };

describe("points ledger (#428)", () => {
  it("pays the dispatcher once per completed issue, including reassignment", async () => {
    const { db, rows } = fakeLedger();
    expect(await awardDispatcher(db, { id: "bug-1", tenantId: "tenant-zedu" }, "dispatcher-owner")).toBe(true);
    expect(await awardDispatcher(db, { id: "bug-1", tenantId: "tenant-zedu" }, "dispatcher-owner")).toBe(false);
    expect(await awardDispatcher(db, { id: "bug-1", tenantId: "tenant-zedu" }, "another-owner")).toBe(false);
    expect(rows).toEqual([{
      tenantId: "tenant-zedu", bugId: "bug-1", userId: "dispatcher-owner",
      role: "dispatcher", points: 0.6, sourceKey: "dispatcher:bug-1",
    }]);
  });

  it("awards the solver the issue's reward once, even when resolved again", async () => {
    const { db, rows } = fakeLedger();
    const entry = solverAward({ ...issue, reward: 5 })!;
    expect(await award(db, entry)).toBe(true);
    expect(await award(db, entry)).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ points: 5, role: "solver" });
  });

  it("skips duplicates in the database instead of failing", async () => {
    const { db, createMany } = fakeLedger();
    await award(db, { tenantId: "t", userId: "u", bugId: null, role: "reporter", points: 5, sourceKey: "reporter:b:u" });
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

});

describe("corrections (#450)", () => {
  it("writes one reversing entry under one key, however often the undo is retried", async () => {
    const createMany = vi.fn(async () => ({ count: 1 }));
    const db = { pointEntry: { update: vi.fn(async () => ({})), createMany } } as never;
    const entry = { id: "entry-1", tenantId: "tenant-zedu", userId: "user-1", bugId: "bug-1", role: "reporter" as const, points: 5 };
    await correct(db, { entry });
    await correct(db, { entry });
    const rows = createMany.mock.calls.map((call) => (call as unknown as [{ data: Array<{ sourceKey: string; points: number }>; skipDuplicates: boolean }])[0]);
    expect(rows.map((r) => r.data[0])).toEqual([
      expect.objectContaining({ sourceKey: "undo:entry-1", points: -5 }),
      expect.objectContaining({ sourceKey: "undo:entry-1", points: -5 }),
    ]);
    expect(rows.every((r) => r.skipDuplicates)).toBe(true);
  });
});

describe("ZIKI swap (#ziki-wallet)", () => {
  const room = { usd: 1_000, ziki: 10_000, soldToday: 0, poolUsd: 10_000, poolZiki: 250_000 };

  it("buys at the fixed $0.04 less a 1% fee, and sells less a 2% fee", () => {
    // $100 → $1 fee → $99 buys 2,475 ZIKI, as the plan says.
    expect(quoteSwap("buy", 100)).toMatchObject({ pay: 100, fee: 1, receive: 2475, poolUsd: 99, poolZiki: 2475 });
    // 1,000 ZIKI → $40 → $0.80 fee → $39.20 paid out.
    expect(quoteSwap("sell", 1000)).toMatchObject({ pay: 1000, poolUsd: 40, fee: 0.8, receive: 39.2 });
  });

  it("refuses a buy beyond your cash or the pool's ZIKI, and a sell beyond your ZIKI or the daily limit", () => {
    expect(swapProblem(quoteSwap("buy", 100), room)).toBeNull();
    expect(swapProblem(quoteSwap("buy", 1_001), room)).toMatch(/enough cash/);
    expect(swapProblem(quoteSwap("buy", 100), { ...room, poolZiki: 1_000 })).toMatch(/pool doesn't have/);
    expect(swapProblem(quoteSwap("sell", 1_000), room)).toBeNull();
    expect(swapProblem(quoteSwap("sell", 20_000), room)).toMatch(/don't have that many/);
    // 4,500 already sold today: only 500 more until 24 hours pass.
    expect(swapProblem(quoteSwap("sell", 1_000), { ...room, soldToday: 4_500 })).toMatch(/sell 500 more ZIKI today/);
    expect(swapProblem(quoteSwap("sell", DAILY_SELL_LIMIT_ZIKI), room)).toBeNull();
  });
});
