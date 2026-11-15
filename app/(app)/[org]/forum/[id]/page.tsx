import { notFound } from "next/navigation";
import { PublicMessageBoard } from "@/components/forum/message-board";
import { requireOrg } from "@/lib/project-route";
import { getForumMessageById, getUserAccessibleScopes } from "@/lib/forum";

export const metadata = {
  title: "Discussion — Organisation Forum",
  description: "Organisation forum discussion thread.",
};

export default async function OrgForumPostDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const { user, organisation } = await requireOrg(org);
  if (!organisation) notFound();

  const [post, scopes] = await Promise.all([
    getForumMessageById(id),
    getUserAccessibleScopes(user.id),
  ]);

  if (!post) notFound();

  return (
    <section className="space-y-6">
      <PublicMessageBoard
        scope="org"
        orgSlug={organisation.slug}
        orgName={organisation.name}
        initialView="detail"
        initialPostId={id}
        initialMessages={[post]}
        organisations={scopes.organisations}
        externalProjects={scopes.externalProjects}
      />
    </section>
  );
}
