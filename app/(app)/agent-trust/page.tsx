import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AgentTrustCard } from "@/components/agent-trust-card";

export const metadata = { title: "Agent trust and autonomy" };

/** Owner-controlled trust & autonomy for the person's own agents (localStorage only, no DB). */
export default async function AgentTrustPage() {
  const user = await requireUser();

  const mine = await prisma.agent.findMany({
    where: { ownerUserId: user.id, revokedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (mine.length === 0) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-10">
        <h1 className="m-0 text-2xl font-extrabold text-zk-text">Agent trust &amp; autonomy</h1>
        <p className="text-sm text-zk-muted">
          You do not own any active agents yet. Connect one at Settings &rarr; Agents to set its trust level.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-10">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-zk-text">Agent trust &amp; autonomy</h1>
        <p className="text-sm text-zk-muted">
          Set a trust meter and autonomy dial for each of your agents. Hard guardrails always require your
          approval regardless of the dial. Stored on this device only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((agent) => (
          <AgentTrustCard key={agent.id} userId={user.id} agentId={agent.id} agentName={agent.name} />
        ))}
      </div>
    </div>
  );
}