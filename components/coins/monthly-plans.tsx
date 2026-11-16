import { endSubscriptionAction, keepSubscriptionAction, subscribeAction } from "@/app/actions/coins";
import { formatUsd } from "@/lib/coins/math";
import { ZIK_PLANS, findPlan, planPriceCents, planSavingCents } from "@/lib/coins/plans";

const card = "rounded-[22px] border border-zk-border bg-zk-surface p-5 sm:p-6";
const label = "text-[11px] font-bold uppercase tracking-[0.08em] text-zk-muted";
const BUTTON =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-bold text-zk-text transition hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue disabled:cursor-not-allowed disabled:opacity-60";

export type PlanView = {
  planId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  payUrl: string | null;
};

const date = (value: Date) => value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * Monthly Ziks plans on the Ziks page (#ziki-coins): a person who doesn't have one picks one and pays through Stripe;
 * a person who does sees what they get, when it renews, and can end it at the end of the month (or take that back).
 * What a plan costs and gives is lib/coins/plans.ts; what is credited is the webhook, once per paid invoice.
 */
export function MonthlyPlans({ subscription, configured }: { subscription: PlanView | null; configured: boolean }) {
  const current = subscription ? findPlan(subscription.planId) : null;

  if (subscription && current) {
    const late = subscription.status === "past_due";
    return (
      <section aria-labelledby="plan" className={card}>
        <h2 id="plan" className={label}>Your monthly plan</h2>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div>
            <p className="m-0 text-2xl font-extrabold text-zk-text">
              {current.label}
              <span className={`ml-3 align-middle text-xs font-bold ${late ? "text-zk-warn-fg" : "text-zk-ok-fg"}`}>{late ? "Payment failed" : "Active"}</span>
            </p>
            <p className="m-0 mt-1 text-sm text-zk-text2">
              {current.zik.toLocaleString("en-US")} Ziks every month for {formatUsd(planPriceCents(current))}. That is {current.discountPercent}% less than buying them as a pack.
            </p>
            <p className="m-0 mt-3 text-sm font-semibold text-zk-text">
              {subscription.cancelAtPeriodEnd
                ? `Ends on ${subscription.currentPeriodEnd ? date(subscription.currentPeriodEnd) : "the end of this month"}. You keep your Ziks.`
                : `Renews on ${subscription.currentPeriodEnd ? date(subscription.currentPeriodEnd) : "its next date"}.`}
            </p>
          </div>
          <form action={subscription.cancelAtPeriodEnd ? keepSubscriptionAction : endSubscriptionAction} className="w-full sm:w-auto">
            <button type="submit" className={`${BUTTON} sm:min-w-44`}>{subscription.cancelAtPeriodEnd ? "Keep my plan" : "End plan"}</button>
          </form>
        </div>
        {late ? (
          <p role="alert" className="mb-0 mt-4 rounded-2xl bg-zk-warn-bg px-4 py-3 text-sm font-semibold text-zk-warn-fg">
            Your last payment didn&apos;t go through, so this month&apos;s Ziks haven&apos;t arrived. Stripe will try again.{" "}
            {subscription.payUrl ? (
              <a href={subscription.payUrl} target="_blank" rel="noreferrer" className="underline">Pay it now</a>
            ) : null}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="plans" className={card}>
      <h2 id="plans" className={label}>Monthly plans</h2>
      <p className="m-0 mt-2 text-sm text-zk-text2">Get Ziks every month for less than the pack price. Cancel any time; you keep the month you paid for.</p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-3">
        {ZIK_PLANS.map((plan) => (
          <li key={plan.id} className="flex flex-col rounded-2xl border border-zk-border p-4">
            <p className="m-0 text-sm font-bold text-zk-text">{plan.label}</p>
            <p className="m-0 mt-2 text-2xl font-extrabold tabular-nums text-zk-text">{plan.zik.toLocaleString("en-US")}</p>
            <p className="m-0 text-xs text-zk-muted">Ziks every month</p>
            <p className="m-0 mt-3 text-sm font-semibold text-zk-text">{formatUsd(planPriceCents(plan))} a month</p>
            <p className="m-0 mt-0.5 text-xs font-semibold text-zk-ok-fg">Save {formatUsd(planSavingCents(plan))} ({plan.discountPercent}% off)</p>
            <form action={subscribeAction} className="mt-auto pt-4">
              <input type="hidden" name="planId" value={plan.id} />
              <button type="submit" disabled={!configured} className={BUTTON}>Subscribe</button>
            </form>
          </li>
        ))}
      </ul>
      {!configured ? <p className="mb-0 mt-3 text-sm text-zk-text2">Monthly plans aren&apos;t available yet.</p> : null}
    </section>
  );
}
