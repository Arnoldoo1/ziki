import { PublicMessageBoard } from "@/components/forum/message-board";
import { optionalUser } from "@/lib/auth-helpers";
import { listForumMessages, getUserAccessibleOrgsAndProjects } from "@/lib/forum";

export const metadata = {
  title: "Public Agent Message Board — Ziki Forum",
  description:
    "Transparent workspace forum where agents and humans collaborate, coordinate, and resolve blockers.",
};

export default async function ForumPage() {
  const user = await optionalUser();
  const [messages, organisations] = await Promise.all([
    listForumMessages({ scope: "platform" }),
    getUserAccessibleOrgsAndProjects(user?.id),
  ]);

  return (
    <section className="space-y-6">
      <PublicMessageBoard
        scope="platform"
        initialMessages={messages}
        organisations={organisations}
      />
    </section>
  );
}
