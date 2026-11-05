"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swapAction } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  BUY_FEE_RATE,
  DAILY_SELL_LIMIT_ZIKI,
  SELL_FEE_RATE,
  ZIKI_PRICE_USD,
  formatUsd,
  formatZiki,
  quoteSwap,
  swapProblem,
  type SwapSide,
} from "@/lib/wallet/rules";

/**
 * The internal swap (#ziki-wallet): buy ZIKI with cash or sell it for cash at
 * the pilot's fixed price. The quote is worked out here as you type with the
 * same rules the server checks again before writing anything.
 */
export function WalletSwap({
  usd,
  ziki,
  soldToday,
  poolUsd,
  poolZiki,
}: {
  usd: number;
  ziki: number;
  soldToday: number;
  poolUsd: number;
  poolZiki: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [side, setSide] = useState<SwapSide>("buy");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  const amount = Number(text.replace(/,/g, ""));
  const quote = quoteSwap(side, amount);
  const entered = text.trim() !== "" && amount > 0;
  const problem = entered ? swapProblem(quote, { usd, ziki, soldToday, poolUsd, poolZiki }) : null;
  const sellLeft = Math.max(0, DAILY_SELL_LIMIT_ZIKI - soldToday);

  const choose = (next: SwapSide) => {
    setSide(next);
    setText("");
    setError(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!entered || problem || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await swapAction(side, amount);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast(side === "buy" ? `Bought ${formatZiki(quote.receive)}.` : `Sold ${formatZiki(quote.pay)} for ${formatUsd(quote.receive)}.`);
      setText("");
      router.refresh();
    });
  };

  const max = side === "buy" ? usd : Math.min(ziki, sellLeft);
  const tab = (value: SwapSide, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={side === value}
      onClick={() => choose(value)}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue ${
        side === value ? "bg-zk-surface text-zk-text shadow-sm" : "text-zk-muted hover:text-zk-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby={`${inputId}-h`} className="flex flex-col gap-4 rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${inputId}-h`} className="text-base font-semibold text-zk-text">Swap</h2>
        <span className="rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-semibold text-zk-text2">Fixed price · pilot</span>
      </div>

      <div role="tablist" aria-label="Buy or sell" className="flex gap-1 rounded-full bg-zk-chip p-1">
        {tab("buy", "Buy ZIKI")}
        {tab("sell", "Sell ZIKI")}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="rounded-2xl bg-zk-bg p-4">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={inputId} className="text-xs font-medium text-zk-muted">You pay</label>
            <button
              type="button"
              className="text-xs font-semibold text-zk-accent hover:underline disabled:opacity-50"
              disabled={max <= 0}
              onClick={() => {
                setError(null);
                setText(String(Math.floor(max * 100) / 100));
              }}
            >
              Max {side === "buy" ? formatUsd(usd) : formatZiki(max)}
            </button>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={text}
              onChange={(event) => {
                setError(null);
                setText(event.target.value.replace(/[^\d.,]/g, ""));
              }}
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-semibold text-zk-text outline-none placeholder:text-zk-muted"
              aria-describedby={`${inputId}-quote`}
            />
            <span className="shrink-0 rounded-full bg-zk-surface px-3 py-1 text-sm font-semibold text-zk-text ring-1 ring-zk-border">
              {side === "buy" ? "USD" : "ZIKI"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-zk-bg p-4">
          <p className="text-xs font-medium text-zk-muted">You receive</p>
          <div className="mt-1 flex items-center gap-3">
            <output className="min-w-0 flex-1 truncate font-mono text-2xl font-semibold text-zk-text" htmlFor={inputId}>
              {entered ? (side === "buy" ? quote.receive.toLocaleString("en-US", { maximumFractionDigits: 2 }) : quote.receive.toFixed(2)) : "0"}
            </output>
            <span className="shrink-0 rounded-full bg-zk-surface px-3 py-1 text-sm font-semibold text-zk-text ring-1 ring-zk-border">
              {side === "buy" ? "ZIKI" : "USD"}
            </span>
          </div>
        </div>

        <dl id={`${inputId}-quote`} className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-zk-muted">Price</dt>
          <dd className="m-0 text-right font-mono text-zk-text">{formatUsd(ZIKI_PRICE_USD)} per ZIKI</dd>
          <dt className="text-zk-muted">Fee</dt>
          <dd className="m-0 text-right font-mono text-zk-text">
            {formatUsd(entered ? quote.fee : 0)} ({Math.round((side === "buy" ? BUY_FEE_RATE : SELL_FEE_RATE) * 100)}%)
          </dd>
          <dt className="text-zk-muted">Price impact</dt>
          <dd className="m-0 text-right font-mono text-zk-text">0% (fixed price)</dd>
          {side === "sell" ? (
            <>
              <dt className="text-zk-muted">Left to sell today</dt>
              <dd className="m-0 text-right font-mono text-zk-text">{formatZiki(sellLeft)}</dd>
            </>
          ) : null}
        </dl>

        {problem || error ? (
          <p role="alert" className="m-0 rounded-xl border border-zk-bad-bd bg-zk-bad-bg px-3 py-2 text-sm text-zk-bad-fg">
            {error ?? problem}
          </p>
        ) : null}

        <Button type="submit" disabled={!entered || Boolean(problem) || pending} className="w-full justify-center py-3 text-sm font-semibold">
          {pending ? "Working…" : side === "buy" ? "Buy ZIKI" : "Sell ZIKI"}
        </Button>
        <p className="m-0 text-xs text-zk-muted">
          {side === "buy"
            ? "Pays from your cash balance. Buying has no daily limit."
            : `Pays into your cash balance. You can sell up to ${formatZiki(DAILY_SELL_LIMIT_ZIKI)} in any 24 hours.`}
        </p>
      </form>
    </section>
  );
}
