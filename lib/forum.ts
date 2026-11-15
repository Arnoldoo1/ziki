import { prisma } from "@/lib/prisma";
import type { Prisma, ForumScope as PrismaForumScope, ForumPostKind, ForumResolution, ForumReplyKind, ForumVerificationOutcome } from "@prisma/client";
import {
  type ForumCategory,
  type ForumMessage,
  type ForumReplyItem,
  type ForumScope,
  type CreateForumMessageInput,
  type CreateForumReplyInput,
  INITIAL_FORUM_MESSAGES,
} from "./forum-types";

export * from "./forum-types";

// In-memory fallback store for offline tests and local state
const memoryForumStore: ForumMessage[] = INITIAL_FORUM_MESSAGES.map((m) => ({
  ...m,
  replies: [...m.replies],
}));

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type ForumPostWithRelations = Prisma.ForumPostGetPayload<{
  include: {
    authorUser: { select: { id: true; name: true; email: true; role: true } };
    authorAgent: { select: { id: true; name: true; username: true; model: true } };
    replies: {
      include: {
        authorUser: { select: { id: true; name: true; email: true; role: true } };
        authorAgent: { select: { id: true; name: true; username: true; model: true } };
        votes: true;
        verifications: true;
      };
    };
    votes: true;
    verifications: true;
    offer: true;
  };
}>;

function mapPrismaReplyToReplyItem(
  reply: ForumPostWithRelations["replies"][number]
): ForumReplyItem {
  const isAgent = Boolean(reply.authorAgentId && reply.authorAgent);
  const authorName = isAgent
    ? reply.authorAgent?.name ?? "Agent"
    : reply.authorUser.name ?? "User";
  const handle = isAgent
    ? reply.authorAgent?.username ?? `agent-${reply.authorAgentId?.slice(0, 6)}`
    : reply.authorUser.email.split("@")[0];

  const helpfulCount = reply.votes?.reduce((acc, v) => acc + v.value, 0) ?? 0;

  return {
    id: reply.id,
    kind: reply.kind as "answer" | "comment",
    accepted: reply.isSolution,
    helpfulCount,
    author: {
      name: authorName,
      ownerName: reply.authorUser.name,
      handle,
      isAgent,
      model: reply.authorAgent?.model ?? undefined,
      role: isAgent ? "AGENT WORKER" : reply.authorUser.role === "admin" ? "ADMIN" : "MEMBER",
      avatarInitials: authorName.slice(0, 2).toUpperCase(),
    },
    content: reply.body,
    createdAt: formatTimeAgo(reply.createdAt),
  };
}

function mapPrismaPostToMessage(post: ForumPostWithRelations): ForumMessage {
  const isAgent = Boolean(post.authorAgentId && post.authorAgent);
  const authorName = isAgent
    ? post.authorAgent?.name ?? "Agent"
    : post.authorUser.name ?? "User";
  const handle = isAgent
    ? post.authorAgent?.username ?? `agent-${post.authorAgentId?.slice(0, 6)}`
    : post.authorUser.email.split("@")[0];

  const prefix =
    post.trackSlug === "marketing" ? "M" : post.kind === "report" ? "R" : "F";
  const code = `${prefix}-${post.number}`;

  const helpfulCount = post.votes?.reduce((acc, v) => acc + v.value, 0) ?? 0;
  const verified = post.verification === "verified";
  const track = post.trackSlug === "your_app" ? "product" : (post.trackSlug as "product" | "marketing" | "security");

  return {
    id: post.id,
    code,
    kind: post.kind as "ask" | "report",
    track,
    category: (post.category as ForumCategory) || "help_needed",
    author: {
      name: authorName,
      ownerName: post.authorUser.name,
      handle,
      isAgent,
      model: post.authorAgent?.model ?? undefined,
      role: isAgent ? "AGENT WORKER" : post.authorUser.role === "admin" ? "ADMIN" : "MEMBER",
      avatarInitials: authorName.slice(0, 2).toUpperCase(),
    },
    title: post.title,
    content: post.body,
    tags: post.tags && post.tags.length > 0 ? post.tags : ["General"],
    views: 1,
    helpfulCount,
    offerAmount: post.offer ? `$${Number(post.offer.amount).toFixed(2)}` : undefined,
    verified,
    createdAt: formatTimeAgo(post.createdAt),
    status: post.resolution === "resolved" ? "resolved" : "open",
    replies: (post.replies || []).map(mapPrismaReplyToReplyItem),
  };
}

export interface ListForumOptions {
  category?: ForumCategory;
  issueNumber?: number;
  status?: "open" | "resolved";
  track?: "product" | "marketing" | "security";
  kind?: "ask" | "report";
  scope?: ForumScope;
  organisationId?: string;
  projectId?: string;
}

export async function listForumMessages(options?: ListForumOptions): Promise<ForumMessage[]> {
  try {
    const where: Prisma.ForumPostWhereInput = {};

    if (options?.scope) {
      where.scope = options.scope as PrismaForumScope;
      if (options.scope === "platform") {
        where.organisationId = null;
        where.projectId = null;
      } else if (options.scope === "org" && options.organisationId) {
        where.organisationId = options.organisationId;
      } else if (options.scope === "project" && options.projectId) {
        where.projectId = options.projectId;
      }
    }

    if (options?.category && options.category !== "all") {
      where.category = options.category;
    }

    if (options?.status) {
      where.resolution = options.status as ForumResolution;
    }

    if (options?.track) {
      where.trackSlug = options.track === "product" ? "your_app" : options.track;
    }

    if (options?.kind) {
      where.kind = options.kind as ForumPostKind;
    }

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        authorUser: { select: { id: true, name: true, email: true, role: true } },
        authorAgent: { select: { id: true, name: true, username: true, model: true } },
        replies: {
          include: {
            authorUser: { select: { id: true, name: true, email: true, role: true } },
            authorAgent: { select: { id: true, name: true, username: true, model: true } },
            votes: true,
            verifications: true,
          },
          orderBy: { createdAt: "asc" },
        },
        votes: true,
        verifications: true,
        offer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (posts && posts.length > 0) {
      return posts.map(mapPrismaPostToMessage);
    }
  } catch (error) {
    // If database is not ready or during tests, fall through to in-memory store
  }

  // In-memory fallback
  return memoryForumStore.filter((msg) => {
    if (options?.category && options.category !== "all" && msg.category !== options.category) {
      return false;
    }
    if (options?.issueNumber && msg.issueNumber !== options.issueNumber) {
      return false;
    }
    if (options?.status && msg.status !== options.status) {
      return false;
    }
    if (options?.track && msg.track !== options.track) {
      return false;
    }
    if (options?.kind && msg.kind !== options.kind) {
      return false;
    }
    return true;
  });
}

export async function getForumMessageById(id: string): Promise<ForumMessage | null> {
  try {
    const post = await prisma.forumPost.findFirst({
      where: {
        OR: [
          { id },
          ...(id.includes("-") && !isNaN(parseInt(id.split("-")[1], 10))
            ? [{ number: parseInt(id.split("-")[1], 10) }]
            : []),
        ],
      },
      include: {
        authorUser: { select: { id: true, name: true, email: true, role: true } },
        authorAgent: { select: { id: true, name: true, username: true, model: true } },
        replies: {
          include: {
            authorUser: { select: { id: true, name: true, email: true, role: true } },
            authorAgent: { select: { id: true, name: true, username: true, model: true } },
            votes: true,
            verifications: true,
          },
          orderBy: { createdAt: "asc" },
        },
        votes: true,
        verifications: true,
        offer: true,
      },
    });

    if (post) {
      return mapPrismaPostToMessage(post);
    }
  } catch {
    // Fall through to in-memory fallback
  }

  return memoryForumStore.find((m) => m.id === id || m.code.toLowerCase() === id.toLowerCase()) ?? null;
}

export async function createForumMessage(
  author: ForumMessage["author"] & { userId?: string; agentId?: string },
  input: CreateForumMessageInput
): Promise<ForumMessage> {
  const trackSlug = input.track === "marketing" ? "marketing" : input.track === "security" ? "security" : "your_app";

  try {
    if (author.userId) {
      // Ensure default track exists
      await prisma.forumTrack.upsert({
        where: { slug: trackSlug },
        update: {},
        create: {
          slug: trackSlug,
          label: trackSlug === "your_app" ? "Your App" : trackSlug === "marketing" ? "Marketing" : "Security",
        },
      });

      const newPost = await prisma.forumPost.create({
        data: {
          scope: (input.scope as PrismaForumScope) || "platform",
          kind: (input.kind as ForumPostKind) || "ask",
          category: input.category || "help_needed",
          trackSlug,
          title: input.title,
          body: input.content,
          tags: input.tags && input.tags.length > 0 ? input.tags : ["General"],
          authorUserId: author.userId,
          authorAgentId: author.agentId || null,
          organisationId: input.organisationId || null,
          projectId: input.projectId || null,
          sourceType: input.sourceType || null,
          sourceId: input.sourceId || null,
        },
        include: {
          authorUser: { select: { id: true, name: true, email: true, role: true } },
          authorAgent: { select: { id: true, name: true, username: true, model: true } },
          replies: {
            include: {
              authorUser: { select: { id: true, name: true, email: true, role: true } },
              authorAgent: { select: { id: true, name: true, username: true, model: true } },
              votes: true,
              verifications: true,
            },
          },
          votes: true,
          verifications: true,
          offer: true,
        },
      });

      const mapped = mapPrismaPostToMessage(newPost);
      memoryForumStore.unshift(mapped);
      return mapped;
    }
  } catch (error) {
    // If DB fails, proceed with memory fallback
  }

  const nextNum = 141 + memoryForumStore.length;
  const prefix = input.track === "marketing" ? "M" : input.kind === "report" ? "R" : "F";
  const newMsg: ForumMessage = {
    id: `fm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: `${prefix}-${nextNum}`,
    kind: input.kind ?? "ask",
    track: input.track ?? "product",
    author: {
      ...author,
      avatarInitials:
        author.avatarInitials ??
        author.name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
    },
    category: input.category,
    title: input.title,
    content: input.content,
    issueNumber: input.issueNumber,
    tags: input.tags && input.tags.length > 0 ? input.tags : ["General"],
    views: 1,
    helpfulCount: 0,
    offerAmount: input.offerAmount || undefined,
    verified: false,
    createdAt: "Just now",
    status: "open",
    replies: [],
  };

  memoryForumStore.unshift(newMsg);
  return newMsg;
}

export async function replyToForumMessage(
  messageId: string,
  author: ForumMessage["replies"][number]["author"] & { userId?: string; agentId?: string },
  content: string,
  kind: "answer" | "comment" = "comment"
): Promise<ForumMessage["replies"][number] | null> {
  try {
    if (author.userId) {
      // Find the post
      const post = await prisma.forumPost.findFirst({
        where: {
          OR: [
            { id: messageId },
            ...(messageId.includes("-") && !isNaN(parseInt(messageId.split("-")[1], 10))
              ? [{ number: parseInt(messageId.split("-")[1], 10) }]
              : []),
          ],
        },
        select: { id: true },
      });

      if (post) {
        const reply = await prisma.forumReply.create({
          data: {
            postId: post.id,
            authorUserId: author.userId,
            authorAgentId: author.agentId || null,
            body: content,
            kind: kind as ForumReplyKind,
          },
          include: {
            authorUser: { select: { id: true, name: true, email: true, role: true } },
            authorAgent: { select: { id: true, name: true, username: true, model: true } },
            votes: true,
            verifications: true,
          },
        });

        const mapped = mapPrismaReplyToReplyItem(reply);
        const target = memoryForumStore.find((m) => m.id === messageId || m.code === messageId);
        if (target) target.replies.push(mapped);
        return mapped;
      }
    }
  } catch {
    // Fall through to memory store
  }

  const target = memoryForumStore.find((m) => m.id === messageId || m.code === messageId);
  if (!target) return null;

  const reply: ForumMessage["replies"][number] = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    helpfulCount: 0,
    author,
    content,
    createdAt: "Just now",
  };

  target.replies.push(reply);
  return reply;
}
