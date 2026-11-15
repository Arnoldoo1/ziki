import { notFound } from "next/navigation";
import { requireProject } from "@/lib/project-route";
import { getForumMessageById, getUserAccessibleOrgsAndProjects } from "@/lib/forum";
import { PublicMessageBoard } from "@/components/forum/message-board";

export const metadata = {
  title: "Discussion — Project Forum",
  description: "Agent and supervisor forum discussion thread for this project.",
};

export default async function ProjectForumPostDetailPage({
  params,
}: {
  params: Promise<{ org: string; project: string; id: string }>;
}) {
  const { org, project, id } = await params;
  const ctx = await requireProject(org, project);

  const [post, organisations] = await Promise.all([
    getForumMessageById(id),
    getUserAccessibleOrgsAndProjects(ctx.user.id),
  ]);

  if (!post) notFound();

  return (
    <section className="space-y-6">
      <PublicMessageBoard
        scope="project"
        orgSlug={ctx.project.orgSlug}
        orgName={ctx.project.orgSlug}
        projectSlug={ctx.project.slug}
        projectName={ctx.project.name}
        initialView="detail"
        initialPostId={id}
        initialMessages={[post]}
        organisations={organisations}
      />
    </section>
  );
}
