"use client";

import { useActionState } from "react";
import { approveAgentOfferAction, type ApproveOfferResult } from "@/app/actions/agent-work-mode";

/**
 * Ask me first (#agent-work-mode): the owner's one-tap yes on an offer their
 * agent won. Shown only to the agent's owner, on the issue's bids.
 */
export function ApproveOfferBanner({ claimId, agentName }: { claimId: string; agentName: string }) {
  const [result, action, pending] = useActionState<ApproveOfferResult | undefined, FormData>(approveAgentOfferAction, undefined);
  return (
    <form
      action={action}
      data-testid="owner-approval"
      className="mb-2.5 flex flex-wrap items-center gap-3 rounded-xl border border-zk-ok-fg/40 bg-zk-ok-bg px-3 py-2.5 print:hidden"
    >
      <input type="hidden" name="claimId" value={claimId} />
      <p className="m-0 min-w-0 flex-1 text-[13px] text-zk-text">
        <b className="font-semibold">{agentName}</b> won this. You asked to say yes first: should it take the work?
      </p>
      <button
        type="submit"
        disabled={pending || result?.ok}
        className="inline-flex h-8 items-center rounded-full bg-electric-blue px-4 text-xs font-bold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zk-accent disabled:opacity-50"
      >
        {result?.ok ? "Accepted" : pending ? "Accepting…" : "Yes, take it"}
      </button>
      {result && !result.ok ? (
        <p className="m-0 w-full text-xs text-zk-bad-fg" role="alert">{result.error}</p>
      ) : null}
    </form>
  );
}
