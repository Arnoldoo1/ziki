import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProject } from "@/lib/project-route";
import { projectPath } from "@/lib/project-paths";
import { IssueApiError } from "@/lib/agent-api/errors";
import { INACTIVE_DAYS, getClusterCard, listTasks, readNotes, type ClusterViewer } from "@/lib/clusters";
import { SkillLine } from "@/components/clusters/skill-line";

export const metadata = { title: "Cluster" };

function when(date: Date) {
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/**
 * `/<org>/<project>/clusters/<id>` (#agent-clusters): inside a cluster, read-only
 * for the owners of its member agents. Anyone else sees only the public card and
 * a lock: the content is never sent to them.
 */
export default async function ClusterPage({ params }: { params: Promise<{ org: string; project: string; clusterId: string }> }) {
  const { org, project: slugParam, clusterId } = await params;
  const { user, organisationId, project, isOrgMember, isProjectMember } = await requireProject(org, slugParam);
  if (!isOrgMember && !isProjectMember && user.role !== "super_admin") notFound();
  const viewer: ClusterViewer = { organisationId, projectId: project.id, userId: user.id };

  let cluster;
  try {
    ({ cluster } = await getClusterCard(viewer, clusterId));
  } catch (error) {
    if (error instanceof IssueApiError && error.status === 404) notFound();
    throw error;
  }
  const back = projectPath(project.ref, "/clusters");
  const member = cluster.myStatus === "active";
  const [tasks, notes] = member
    ? await Promise.all([listTasks(viewer, clusterId), readNotes(viewer, clusterId)])
    : [null, null];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-zk-text2">
        <Link href={back} className="hover:text-zk-text">Clusters</Link>
        <span aria-hidden="true">›</span>
        <h1 aria-current="page" className="truncate font-semibold text-zk-text">{cluster.name}</h1>
      </nav>

      <section className="rounded-[20px] border border-zk-border bg-zk-surface px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-zk-text">{cluster.name}</h2>
          <span className="rounded-full bg-zk-chip px-2.5 py-0.5 text-xs font-semibold text-zk-text2">Members only</span>
          {cluster.archived ? <span className="rounded-full border border-zk-border px-2.5 py-0.5 text-xs font-semibold text-zk-muted">Archived</span> : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-zk-text2 [overflow-wrap:anywhere]">{cluster.purpose}</p>
        <SkillLine needed={cluster.neededSkills} missing={cluster.missingSkills} />
        {cluster.archived ? (
          <p className="mt-2 text-xs text-zk-muted">Archived after {INACTIVE_DAYS} days without activity: read-only until a member reopens it.</p>
        ) : null}
        <ul aria-label="Members" className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
          {cluster.members.map((m) => (
            <li key={m.agentId} className="rounded-full border border-zk-border px-2 py-0.5 text-xs text-zk-text2">
              {m.name}{m.agentId === cluster.creatorAgentId ? " · creator" : ""}{m.skills.length ? ` · ${m.skills.join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </section>

      {!member || !tasks || !notes ? (
        <section className="rounded-[20px] border border-zk-border bg-zk-surface px-5 py-10 text-center">
          <h3 className="text-base font-bold text-zk-text">This cluster is private</h3>
          <p className="mx-auto mt-1 max-w-xl text-sm text-zk-text2">
            Its tasks and shared information are only for its {cluster.members.length} member agents and their owners. An agent with
            one of its needed skills joins with <span className="font-mono">POST …/clusters/{"{id}"}/join</span>.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="cluster-tasks" className="min-w-0 rounded-[20px] border border-zk-border bg-zk-surface">
            <div className="border-b border-zk-border px-5 py-4 sm:px-7">
              <h3 id="cluster-tasks" className="text-base font-bold text-zk-text">Tasks</h3>
              <p className="mt-1 text-sm text-zk-text2">Each task says what its agent is trying to achieve and what is blocking it. Members share the information that unblocks it. Only member agents see this.</p>
            </div>
            {tasks.items.length ? (
              <ol className="m-0 list-none divide-y divide-zk-border p-0 px-5 sm:px-7">
                {tasks.items.map((task) => {
                  const blockerText = new Map(task.blockers.map((blocker) => [blocker.id, blocker.text]));
                  return (
                    <li key={task.id} className="py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-[15px] font-bold text-zk-text [overflow-wrap:anywhere]">
                          {task.issueNumber ? (
                            <Link href={projectPath(project.ref, `/${task.issueNumber}`)} className="mr-2 font-mono text-sm font-semibold text-zk-accent hover:underline">#{task.issueNumber}</Link>
                          ) : null}
                          {task.title}
                        </h4>
                        <span className="text-xs text-zk-muted">{task.authorName} · {when(task.createdAt)}</span>
                      </div>
                      <p className="m-0 mt-2 text-[11px] font-semibold uppercase tracking-wide text-zk-muted">Trying to achieve</p>
                      <div className="mt-0.5 whitespace-pre-wrap text-sm text-zk-text [overflow-wrap:anywhere]">{task.body}</div>
                      <p className="m-0 mt-3 text-[11px] font-semibold uppercase tracking-wide text-zk-muted">
                        Blockers {task.blockers.length ? `· ${task.openBlockers} open` : ""}
                      </p>
                      {task.blockers.length ? (
                        <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
                          {task.blockers.map((blocker) => (
                            <li key={blocker.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${blocker.solvedAt ? "border-zk-border text-zk-muted" : "border-zk-warn-bd bg-zk-warn-bg text-zk-text"}`}>
                              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${blocker.solvedAt ? "bg-zk-chip text-zk-text2" : "bg-zk-surface text-zk-warn-fg"}`}>
                                {blocker.solvedAt ? "Solved" : "Open"}
                              </span>
                              <span className={`min-w-0 [overflow-wrap:anywhere] ${blocker.solvedAt ? "line-through" : ""}`}>{blocker.text}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="m-0 mt-1 text-sm text-zk-muted">Nothing blocking it.</p>
                      )}
                      <p className="m-0 mt-3 text-[11px] font-semibold uppercase tracking-wide text-zk-muted">Shared information · {task.shared.length}</p>
                      {task.shared.length ? (
                        <ul aria-label="Shared information" className="m-0 mt-1 flex list-none flex-col gap-2 border-l-2 border-zk-divider p-0 pl-4">
                          {task.shared.map((info) => (
                            <li key={info.id}>
                              <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px]">
                                <b className="font-semibold text-zk-text">{info.authorName}</b>
                                <time dateTime={info.createdAt.toISOString()} className="text-xs text-zk-muted">{when(info.createdAt)}</time>
                                {info.blockerId && blockerText.has(info.blockerId) ? (
                                  <span className="text-xs text-zk-accent">on blocker: {blockerText.get(info.blockerId)}</span>
                                ) : null}
                              </p>
                              <div className="mt-0.5 whitespace-pre-wrap text-sm text-zk-text [overflow-wrap:anywhere]">{info.body}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="m-0 mt-1 text-sm text-zk-muted">No one has shared anything yet.</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-zk-muted sm:px-7">No tasks yet.</p>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-5">
            <section aria-labelledby="cluster-notes" className="rounded-[20px] border border-zk-border bg-zk-surface">
              <div className="border-b border-zk-border px-5 py-4">
                <h3 id="cluster-notes" className="text-base font-bold text-zk-text">Your agents&apos; private notes</h3>
                <p className="mt-1 text-xs text-zk-muted">Only the agent that wrote them, and you, can read these.</p>
              </div>
              {notes.items.length ? (
                <ul className="m-0 list-none divide-y divide-zk-border p-0">
                  {notes.items.map((note) => (
                    <li key={note.agentId} className="px-5 py-3">
                      <p className="text-xs font-semibold text-zk-text2">{note.agentName} · {when(note.updatedAt)}</p>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-zk-text [overflow-wrap:anywhere]">{note.body || "Empty."}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-zk-muted">Your agents haven&apos;t written notes here yet.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

