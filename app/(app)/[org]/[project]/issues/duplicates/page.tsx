import Link from "next/link";
import { requireProject } from "@/lib/project-route";

import { formatIssueNumber } from "@/lib/issue-number";
import { statusLabel } from "@/lib/labels";

export const metadata = { title: "Duplicate clusters" };

export default async function DuplicateClustersPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>;
}) {
  const { org, project } = await params;
  const { project: resolved } = await requireProject(org, project);
  const projectId = resolved.id;

  const issues = await (async () => {
    const { prisma } = await import("@/lib/prisma");
    return prisma.bug.findMany({
      where: {
        projectId,
        OR: [{ duplicateOfId: { not: null } }, { duplicates: { some: {} } }],
      },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        duplicateOfId: true,
        duplicateOf: { select: { id: true, number: true, title: true } },
        duplicates: { select: { id: true } },
      },
      orderBy: { number: "asc" },
    });
  })();

  // Group duplicates by their canonical issue.
  const clusters = new Map<string, { canonical: { id: string; number: number; title: string }; dupes: typeof issues }>();
  for (const issue of issues) {
    if (issue.duplicateOf) {
      const key = issue.duplicateOf.id;
      if (!clusters.has(key)) {
        clusters.set(key, { canonical: issue.duplicateOf, dupes: [] });
      }
      clusters.get(key)!.dupes.push(issue);
    } else if (issue.duplicates.length > 0) {
      if (!clusters.has(issue.id)) {
        clusters.set(issue.id, { canonical: { id: issue.id, number: issue.number, title: issue.title }, dupes: [] });
      }
    }
  }
  // Attach duplicates to canonicals that are also in the list but weren't pushed (above handled).
  for (const issue of issues) {
    if (issue.duplicateOf && clusters.has(issue.duplicateOf.id)) {
      // already pushed
    }
  }

  const clusterList = [...clusters.values()].filter((c) => c.dupes.length > 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-10">
      <div>
        <Link href={`/${org}/${project}/issues/all`} className="text-sm font-semibold text-zk-accent hover:underline">
          Back to issues
        </Link>
        <h1 className="m-0 text-2xl font-extrabold text-zk-text">Duplicate clusters</h1>
        <p className="text-sm text-zk-muted">
          Issues marked as duplicates of another issue, grouped by the canonical issue.
        </p>
      </div>

      {clusterList.length === 0 ? (
        <div className="rounded-2xl border border-zk-border bg-zk-surface p-6 text-sm text-zk-muted">
          No duplicate clusters found in this project.
        </div>
      ) : (
        <div className="space-y-4">
          {clusterList.map((cluster) => (
            <section key={cluster.canonical.id} className="rounded-2xl border border-zk-border bg-zk-surface p-5">
              <h2 className="m-0 text-base font-bold text-zk-text">
                Canonical:{" "}
                <Link href={`/${org}/${project}/${cluster.canonical.number}`} className="text-zk-accent hover:underline">
                  #{formatIssueNumber(cluster.canonical.number)} {cluster.canonical.title}
                </Link>
              </h2>
              <ul className="mt-3 space-y-2">
                {cluster.dupes.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-zk-border bg-zk-bg px-3 py-2">
                    <Link href={`/${org}/${project}/${d.number}`} className="min-w-0 truncate text-sm text-zk-text hover:underline">
                      #{formatIssueNumber(d.number)} {d.title}
                    </Link>
                    <span className="shrink-0 text-xs text-zk-muted">{statusLabel[d.status as keyof typeof statusLabel] ?? d.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
