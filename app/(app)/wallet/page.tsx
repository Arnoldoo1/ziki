import { requireUser } from "@/lib/auth-helpers";
import { LocalTime } from "@/components/local-time";
import { WalletSwap } from "@/components/wallet-swap";
import { walletActivity, walletSummary, type WalletActivity } from "@/lib/wallet/ledger";
import { ZIKI_PRICE_USD, formatUsd, formatZiki } from "@/lib/wallet/rules";

export const metadata = { title: "Wallet" };

const kindLabel: Record<WalletActivity["kind"], string> = {
  genesis: "Opening balance",
  swap_buy: "Bought ZIKI",
  swap_sell: "Sold ZIKI",
  swap_fee: "Fee",
  reward: "Reward",
  spend: "Spent",
};

function Signed({ value, unit }: { value: number; unit: "usd" | "ziki" }) {
  if (Math.abs(value) < 1e-9) return null;
  const text = unit === "usd" ? formatUsd(Math.abs(value)) : formatZiki(Math.abs(value));
  return (
    <span className={`font-mono tabular-nums ${value > 0 ? "text-zk-ok-fg" : "text-zk-text2"}`}>
      {value > 0 ? "+" : "−"}
      {text}
    </span>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-zk-border bg-zk-surface px-4 py-3.5">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">{label}</span>
      <span className="truncate font-mono text-lg font-semibold tabular-nums text-zk-text">{value}</span>
      {note ? <span className="text-xs text-zk-muted">{note}</span> : null}
    </div>
  );
}

/**
 * Wallet (#ziki-wallet): your ZIKI and cash balances, what you earned and
 * spent, your history, and the internal swap.
 */
export default async function WalletPage() {
  const user = await requireUser();
  const [summary, activity] = await Promise.all([walletSummary(user.id), walletActivity(user.id)]);
  const zikiValue = summary.ziki * ZIKI_PRICE_USD;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zk-text">Wallet</h1>
          <p className="text-sm text-zk-text2">
            ZIKI is Ziki&apos;s own coin. During the pilot it trades only here, at a fixed {formatUsd(ZIKI_PRICE_USD)} ($1 = 25 ZIKI).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {/* The balance, large, with what it's worth in cash. */}
          <section aria-label="Balance" className="flex flex-col gap-4 rounded-[20px] border border-zk-warn-bd bg-zk-warn-bg/40 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-extrabold text-white shadow-inner">Z</span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">ZIKI balance</p>
                <p className="m-0 truncate font-mono text-3xl font-bold tabular-nums text-zk-text">{formatZiki(summary.ziki)}</p>
                <p className="m-0 text-sm text-zk-text2">≈ {formatUsd(zikiValue)}</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Cash" value={formatUsd(summary.usd)} note="Spend it on ZIKI" />
            <Stat label="Staked" value={formatZiki(0)} note="Staking comes with tiers" />
            <Stat label="Rewards" value={formatZiki(summary.rewards)} note="Earned for work" />
            <Stat label="Spent" value={formatZiki(summary.spent)} note="On Ziki features" />
          </div>

          <section aria-labelledby="wallet-history" className="rounded-[20px] border border-zk-border bg-zk-surface">
            <h2 id="wallet-history" className="border-b border-zk-divider px-5 py-3.5 text-base font-semibold text-zk-text">History</h2>
            {activity.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-sm text-zk-muted">
                Nothing yet. Rewards for approved work, swaps and spending will show here.
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {activity.map((row) => (
                  <li key={row.transferId} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zk-divider px-5 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-medium text-zk-text">{kindLabel[row.kind]}</p>
                      <p className="m-0 truncate text-xs text-zk-muted">
                        {row.memo} · <LocalTime date={row.createdAt} />
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-sm">
                      <Signed value={row.ziki} unit="ziki" />
                      <Signed value={row.usd} unit="usd" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <WalletSwap usd={summary.usd} ziki={summary.ziki} soldToday={summary.soldToday} poolUsd={summary.pool.usd} poolZiki={summary.pool.ziki} />
          <section aria-label="Pool" className="flex flex-col gap-2 rounded-[20px] border border-zk-border bg-zk-surface px-5 py-4 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">Pool</h2>
            <div className="flex justify-between gap-3"><span className="text-zk-muted">Cash in pool</span><span className="font-mono text-zk-text">{formatUsd(summary.pool.usd)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zk-muted">ZIKI in pool</span><span className="font-mono text-zk-text">{formatZiki(summary.pool.ziki)}</span></div>
            <p className="m-0 text-xs text-zk-muted">
              Every ZIKI sold from the pool is paid for in cash at the fixed price, so the pool can always buy it back.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
