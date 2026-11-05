import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type WalletAsset, type WalletEntryKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatUsd, formatZiki, quoteSwap, swapProblem, type SwapQuote, type SwapSide } from "@/lib/wallet/rules";

/**
 * The ZIKI wallet ledger (#ziki-wallet): reading balances and history, and
 * the swap. Balances are always sums of WalletEntry rows, never stored.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export const POOL = "pool";
export const FEES = "fees";

/** Thrown when a swap is refused; the message is for the person. */
export class SwapRefused extends Error {}

type Owner = { userId: string } | { system: string };

const ownerWhere = (owner: Owner): Prisma.WalletEntryWhereInput =>
  "userId" in owner ? { userId: owner.userId } : { userId: null, system: owner.system };

/** Cash and ZIKI held by a person or one of Ziki's own wallets. */
export async function balancesOf(db: Db, owner: Owner): Promise<{ usd: number; ziki: number }> {
  const rows = await db.walletEntry.groupBy({ by: ["asset"], where: ownerWhere(owner), _sum: { amount: true } });
  const sum = (asset: WalletAsset) => Number(rows.find((row) => row.asset === asset)?._sum.amount ?? 0);
  return { usd: sum("usd"), ziki: sum("ziki") };
}

/** ZIKI this person sold in the last 24 hours, for the daily sell limit. */
async function soldInLastDay(db: Db, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const row = await db.walletEntry.aggregate({
    where: { userId, asset: "ziki", kind: "swap_sell", createdAt: { gte: since } },
    _sum: { amount: true },
  });
  return -Number(row._sum.amount ?? 0);
}

export type WalletSummary = {
  usd: number;
  ziki: number;
  /** ZIKI earned for work, ever. */
  rewards: number;
  /** ZIKI spent in Ziki, ever. */
  spent: number;
  soldToday: number;
  pool: { usd: number; ziki: number };
};

export async function walletSummary(userId: string): Promise<WalletSummary> {
  const [mine, byKind, soldToday, pool] = await Promise.all([
    balancesOf(prisma, { userId }),
    prisma.walletEntry.groupBy({
      by: ["kind"],
      where: { userId, asset: "ziki", kind: { in: ["reward", "spend"] } },
      _sum: { amount: true },
    }),
    soldInLastDay(prisma, userId),
    balancesOf(prisma, { system: POOL }),
  ]);
  const kindSum = (kind: WalletEntryKind) => Number(byKind.find((row) => row.kind === kind)?._sum.amount ?? 0);
  return { ...mine, rewards: kindSum("reward"), spent: -kindSum("spend"), soldToday, pool };
}

export type WalletActivity = {
  transferId: string;
  kind: WalletEntryKind;
  memo: string;
  createdAt: Date;
  /** This person's change in each asset for the transfer. */
  usd: number;
  ziki: number;
};

/** The person's history, newest first: one row per transfer (a swap's entries together). */
export async function walletActivity(userId: string, take = 50): Promise<WalletActivity[]> {
  const entries = await prisma.walletEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: take * 3,
    select: { transferId: true, kind: true, memo: true, asset: true, amount: true, createdAt: true },
  });
  const rows = new Map<string, WalletActivity>();
  for (const entry of entries) {
    const row = rows.get(entry.transferId) ?? { transferId: entry.transferId, kind: entry.kind, memo: entry.memo ?? "", createdAt: entry.createdAt, usd: 0, ziki: 0 };
    // The swap's own entry names the transfer, not its fee.
    if (entry.kind !== "swap_fee") {
      row.kind = entry.kind;
      if (entry.memo) row.memo = entry.memo;
    }
    row[entry.asset] += Number(entry.amount);
    rows.set(entry.transferId, row);
  }
  return [...rows.values()].slice(0, take);
}

/**
 * Swaps cash for ZIKI or ZIKI for cash at the fixed price, as one transfer:
 * the person, the pool and the fees wallet each get their entries, and each
 * asset sums to zero. The pool is locked for the whole check-and-write, so
 * two swaps can't both spend the same pool balance.
 */
export async function swap(userId: string, side: SwapSide, amount: number): Promise<SwapQuote> {
  const quote = quoteSwap(side, amount);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ziki-wallet-pool'))`;
    const [mine, pool, soldToday] = await Promise.all([
      balancesOf(tx, { userId }),
      balancesOf(tx, { system: POOL }),
      side === "sell" ? soldInLastDay(tx, userId) : Promise.resolve(0),
    ]);
    const problem = swapProblem(quote, { ...mine, soldToday, poolUsd: pool.usd, poolZiki: pool.ziki });
    if (problem) throw new SwapRefused(problem);

    const transferId = randomUUID();
    const kind: WalletEntryKind = side === "buy" ? "swap_buy" : "swap_sell";
    const memo = side === "buy"
      ? `Bought ${formatZiki(quote.receive)} for ${formatUsd(quote.pay)}`
      : `Sold ${formatZiki(quote.pay)} for ${formatUsd(quote.receive)}`;
    const entry = (owner: Owner, asset: WalletAsset, value: number, entryKind: WalletEntryKind = kind) => ({
      userId: "userId" in owner ? owner.userId : null,
      system: "system" in owner ? owner.system : null,
      asset,
      amount: new Prisma.Decimal(value.toFixed(6)),
      kind: entryKind,
      transferId,
      memo: entryKind === "swap_fee" ? `Fee: ${formatUsd(quote.fee)}` : memo,
    });
    const me = { userId };
    const pool$ = { system: POOL };
    const fees = { system: FEES };
    const data = side === "buy"
      ? [
          entry(me, "usd", -quote.pay),
          entry(pool$, "usd", quote.poolUsd),
          entry(fees, "usd", quote.fee, "swap_fee"),
          entry(pool$, "ziki", -quote.receive),
          entry(me, "ziki", quote.receive),
        ]
      : [
          entry(me, "ziki", -quote.pay),
          entry(pool$, "ziki", quote.pay),
          entry(pool$, "usd", -quote.poolUsd),
          entry(fees, "usd", quote.fee, "swap_fee"),
          entry(me, "usd", quote.receive),
        ];
    await tx.walletEntry.createMany({ data });
    return quote;
  });
}
