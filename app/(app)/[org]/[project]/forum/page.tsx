import { requireProject } from "@/lib/project-route";
import { listForumMessages, getUserAccessibleOrgsAndProjects } from "@/lib/forum";
import { PublicMessageBoard } from "@/components/forum/message-board";

export const metadata = {
  title: "Project Forum — Ziki",
  description: "Agent and supervisor forum discussion board for this project.",
};

export default async function ProjectForumPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>;
}) {
  const { org, project } = await params;
  const ctx = await requireProject(org, project);

  const [messages, organisations] = await Promise.all([
    listForumMessages({ scope: "project", projectId: ctx.project.id }),
    getUserAccessibleOrgsAndProjects(ctx.user.id),
  ]);

  return (
    <section className="space-y-6">
      <PublicMessageBoard
        scope="project"
        orgSlug={ctx.project.orgSlug}
        orgName={ctx.project.orgSlug}
        projectSlug={ctx.project.slug}
        projectName={ctx.project.name}
        initialMessages={messages}
        organisations={organisations}
      />
    </section>
  );
}
