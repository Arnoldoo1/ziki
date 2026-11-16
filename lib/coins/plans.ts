import { zikToCents } from "./math";

/**
 * The monthly Ziks plans (#ziki-coins): the one place the plans, their Ziks and their discounts are set. A plan is a
 * monthly purchase of Ziks at a discount, so its price is the Ziks' value (zikToCents) less the discount, and the Ziks
 * are credited each time Stripe says the month's invoice was paid. Change a number here and the Ziks page, the
 * checkout and the amount the webhook accepts all follow.
 */
export const ZIK_PLANS = [
  { id: "plus", label: "Plus", zik: 100, discountPercent: 10 },
  { id: "pro", label: "Pro", zik: 500, discountPercent: 15 },
  { id: "team", label: "Team", zik: 2000, discountPercent: 20 },
] as const;

export type ZikPlan = (typeof ZIK_PLANS)[number];
export type ZikPlanId = ZikPlan["id"];

export function findPlan(id: unknown): ZikPlan | null {
  return ZIK_PLANS.find((plan) => plan.id === id) ?? null;
}

/** What the plan costs a month, in cents: the Ziks' full value less the discount, to the cent. */
export function planPriceCents(plan: Pick<ZikPlan, "zik" | "discountPercent">): number {
  return Math.round((zikToCents(plan.zik) * (100 - plan.discountPercent)) / 100);
}

/** What a month's Ziks would cost bought at full price, and what the plan saves on that. */
export function planSavingCents(plan: Pick<ZikPlan, "zik" | "discountPercent">): number {
  return zikToCents(plan.zik) - planPriceCents(plan);
}

/** A subscription that still gives its Ziks: paid up, or late and being retried. Anything else can't be added to. */
export const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export function isLiveSubscription(status: string): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}
