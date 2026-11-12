import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { currentOrganisationAccess } from "@/lib/organisation-access";
import { prisma } from "@/lib/prisma";
import { TARGET_KIND_LABEL } from "@/lib/security-checks";
import { canPayForCheck } from "@/lib/security-checks/payment";
import { PayCheckForm } from "@/components/security-checks/entry-pay-form";
import { OrgPageHeader, orgCard } from "../../../../[org]/[project]/org/org-ui";

export const metadata = { title: "Pay for a check" };

/**
 * Step 3, pay or skip (#security-checks, part 1). Paying is simulated for now:
 * it only marks the check paid. Skipping keeps it unpaid; the client sees a
 * teaser of the report and can pay from there later.
 */
export default async function PaySecurityCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const access = await currentOrganisationAccess(user.id, user.role);
  if (!access.organisationId) notFound();

  const check = await prisma.securityCheck.findFirst({
    // Only the person who asked for the check can see or pay for it.
    where: { id, organisationId: access.organisationId, requestedById: user.id },
    select: {
      id: true,
      status: true,
      paidAt: true,
      priceCoins: true,
      target: { select: { kind: true, value: true, verifiedAt: true } },
    },
  });
  if (!check) notFound();

  const payable = canPayForCheck(check);
  const back = `/security?check=${encodeURIComponent(check.id)}`;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 pb-10 sm:gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-zk-muted">
        <Link href="/security" className="font-semibold text-zk-accent hover:underline">Security</Link>
        <span aria-hidden="true"> / </span>
        <span className="font-mono">{check.target.value}</span>
      </nav>
      <OrgPageHeader heading="h1" title="Start the check">
        Agents look at {check.target.value} for weaknesses and report what they find. They never break in.
      </OrgPageHeader>

      <section className={orgCard} aria-labelledby="pay-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-sm text-zk-text2">{TARGET_KIND_LABEL[check.target.kind]}</p>
            <p className="m-0 truncate font-mono text-base font-semibold text-zk-text">{check.target.value}</p>
          </div>
          <div className="text-right">
            <p id="pay-heading" className="m-0 text-3xl font-bold tabular-nums tracking-tight text-zk-text">
              {check.priceCoins} <span className="text-base font-semibold text-zk-text2">coins</span>
            </p>
            <p className="m-0 text-xs text-zk-muted">One check, one report</p>
          </div>
        </div>

        <ul className="mb-0 mt-5 grid list-none gap-2 p-0 text-sm text-zk-text2 sm:grid-cols-3">
          <li className="rounded-[14px] bg-zk-bg px-3 py-2"><b className="block text-zk-text">Every problem</b>worst first</li>
          <li className="rounded-[14px] bg-zk-bg px-3 py-2"><b className="block text-zk-text">How to fix each one</b>in plain words</li>
          <li className="rounded-[14px] bg-zk-bg px-3 py-2"><b className="block text-zk-text">PDF or Fix on Ziki</b>your choice</li>
        </ul>

        <div className="mt-6">
          {check.paidAt ? (
            <p className="m-0 rounded-[14px] bg-zk-ok-bg px-3 py-2 text-sm text-zk-ok-fg">
              Already paid. <Link href={back} className="font-semibold underline">Back to your checks</Link>
            </p>
          ) : payable ? (
            <PayCheckForm checkId={check.id} priceCoins={check.priceCoins} skipHref={back} />
          ) : (
            <p className="m-0 text-sm text-zk-text2">This check was cancelled, so there&apos;s nothing to pay.</p>
          )}
        </div>

        {!check.target.verifiedAt && !check.paidAt && payable ? (
          <p className="mb-0 mt-4 text-xs text-zk-muted">Agents start only once you&apos;ve shown {check.target.value} is yours, whether you pay now or later.</p>
        ) : null}
      </section>
    </div>
  );
}
