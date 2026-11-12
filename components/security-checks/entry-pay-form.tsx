"use client";

import Link from "next/link";
import { useActionState } from "react";
import { paySecurityCheck } from "@/app/actions/security-checks";

/** "Pay 50 coins" or "Skip for now" (#security-checks, part 1). Paying is simulated: no coins move yet. */
export function PayCheckForm({ checkId, priceCoins, skipHref }: { checkId: string; priceCoins: number; skipHref: string }) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(() => paySecurityCheck(checkId), {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center rounded-full bg-electric-blue-strong px-6 text-[15px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Paying…" : `Pay ${priceCoins} coins`}
        </button>
        <Link href={skipHref} className="inline-flex h-12 items-center rounded-full px-4 text-sm font-semibold text-zk-text2 hover:bg-zk-chip">
          Skip for now
        </Link>
      </div>
      {state.error ? <p role="alert" className="m-0 text-sm text-zk-bad-fg">{state.error}</p> : null}
      <p className="m-0 text-xs text-zk-muted">Test payment: no coins are taken yet. Skip and you&apos;ll see a preview of the report, then pay to see all of it.</p>
    </form>
  );
}
