/**
 * The ZIKI wallet's rules for the pilot (#ziki-wallet, docs: ZIKI token plan).
 * ZIKI trades only inside Ziki, at a fixed price, against a pool that opened
 * with $10,000 and 250,000 ZIKI. Amounts are worked in millionths (integers)
 * so a quote never drifts by a rounding error; the ledger stores 6 decimals.
 */

/** Fixed pilot price: $0.04 per ZIKI ($1 = 25 ZIKI). */
export const ZIKI_PRICE_USD = 0.04;
/** Fee on a buy, taken from the cash paid. */
export const BUY_FEE_RATE = 0.01;
/** Fee on a sell, taken from the cash received. */
export const SELL_FEE_RATE = 0.02;
/** Most ZIKI one person may sell in any 24 hours. Buying has no limit. */
export const DAILY_SELL_LIMIT_ZIKI = 5000;
/** The pool's starting balance (prisma/migrations/…_ziki_wallet_pool). */
export const POOL_START = { usd: 10_000, ziki: 250_000 } as const;
/** Smallest trade, so a fee always rounds to something. */
export const MIN_BUY_USD = 1;
export const MIN_SELL_ZIKI = 25;

const MICRO = 1_000_000;
/** The price in millionths of a dollar, so conversions are exact integer division. */
const PRICE_MICRO = BigInt(Math.round(ZIKI_PRICE_USD * MICRO));
const toMicro = (value: number) => Math.round(value * MICRO);
const fromMicro = (micro: number) => micro / MICRO;
/** Round down to whole cents, in micros. */
const centsDown = (micro: number) => Math.floor(micro / 10_000) * 10_000;
/** Dollars (micros) → ZIKI (micros), rounded down. BigInt: big amounts pass 2^53 midway. */
const usdToZiki = (usdMicro: number) => Number((BigInt(usdMicro) * BigInt(MICRO)) / PRICE_MICRO);
/** ZIKI (micros) → dollars (micros), rounded down. */
const zikiToUsd = (zikiMicro: number) => Number((BigInt(zikiMicro) * PRICE_MICRO) / BigInt(MICRO));

export type SwapSide = "buy" | "sell";

export type SwapQuote = {
  side: SwapSide;
  /** What the person gives: dollars for a buy, ZIKI for a sell. */
  pay: number;
  /** What they get: ZIKI for a buy, dollars for a sell. */
  receive: number;
  /** The fee, in dollars. */
  fee: number;
  /** Dollars that move into (buy) or out of (sell) the pool. */
  poolUsd: number;
  /** ZIKI that move out of (buy) or into (sell) the pool. */
  poolZiki: number;
};

/**
 * What a trade gives at the fixed price. Buy: pay $X, 1% fee, the rest buys
 * ZIKI ($100 → 2,475 ZIKI). Sell: sell Z ZIKI for Z × $0.04, less 2%, rounded
 * down to the cent.
 */
export function quoteSwap(side: SwapSide, amount: number): SwapQuote {
  const pay = Number.isFinite(amount) && amount > 0 ? amount : 0;
  if (side === "buy") {
    const payMicro = centsDown(toMicro(pay));
    const feeMicro = Math.round(payMicro * BUY_FEE_RATE);
    const netMicro = payMicro - feeMicro;
    const zikiMicro = usdToZiki(netMicro);
    return { side, pay: fromMicro(payMicro), receive: fromMicro(zikiMicro), fee: fromMicro(feeMicro), poolUsd: fromMicro(netMicro), poolZiki: fromMicro(zikiMicro) };
  }
  const zikiMicro = toMicro(pay);
  const grossMicro = centsDown(zikiToUsd(zikiMicro));
  const feeMicro = Math.round(grossMicro * SELL_FEE_RATE);
  return { side, pay: fromMicro(zikiMicro), receive: fromMicro(grossMicro - feeMicro), fee: fromMicro(feeMicro), poolUsd: fromMicro(grossMicro), poolZiki: fromMicro(zikiMicro) };
}

export type SwapState = {
  /** The person's balances. */
  usd: number;
  ziki: number;
  /** ZIKI they sold in the last 24 hours. */
  soldToday: number;
  /** The pool's balances. */
  poolUsd: number;
  poolZiki: number;
};

/** Why this trade can't go through, in words for the person, or null when it can. */
export function swapProblem(quote: SwapQuote, state: SwapState): string | null {
  if (quote.side === "buy") {
    if (quote.pay < MIN_BUY_USD) return `The smallest buy is $${MIN_BUY_USD}.`;
    if (quote.pay > state.usd + 1e-9) return "You don't have enough cash for that.";
    if (quote.receive > state.poolZiki + 1e-9) {
      return "The pool doesn't have that many ZIKI left. Buying pauses until someone sells or more supply unlocks.";
    }
    return null;
  }
  if (quote.pay < MIN_SELL_ZIKI) return `The smallest sale is ${MIN_SELL_ZIKI} ZIKI.`;
  if (quote.pay > state.ziki + 1e-9) return "You don't have that many ZIKI.";
  const left = Math.max(0, DAILY_SELL_LIMIT_ZIKI - state.soldToday);
  if (quote.pay > left + 1e-9) {
    return `You can sell ${left.toLocaleString("en-US")} more ZIKI today. The limit is ${DAILY_SELL_LIMIT_ZIKI.toLocaleString("en-US")} ZIKI in any 24 hours.`;
  }
  if (quote.poolUsd > state.poolUsd + 1e-9) return "The pool can't pay that much cash right now. Try a smaller amount.";
  return null;
}

/** "$1,234.50" */
export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "2,475 ZIKI", with up to 2 decimals when there are any. */
export function formatZiki(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ZIKI`;
}
