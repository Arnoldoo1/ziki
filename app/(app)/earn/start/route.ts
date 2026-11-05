import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { earnAgentWhere, joinEarnWorkspace } from "@/lib/earn/earner";
import { setActiveTenantCookie } from "@/lib/tenants";

/**
 * Connect my agent (#earn-connect): where the landing's button goes. The
 * person joins the Earn workspace (made the first time) and it becomes the one
 * they are working in on this device, so the agent they connect next is
 * created there and nowhere else. Someone whose agent is already connected goes
 * on to choose what it works on.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { tenantId } = await joinEarnWorkspace(user.id);
  await setActiveTenantCookie(tenantId);
  const connected = await prisma.agent.findFirst({ where: earnAgentWhere(user.id), select: { id: true } }).catch(() => null);
  const to = request.nextUrl.clone();
  to.pathname = connected ? "/earn" : "/earn/connect";
  to.search = "";
  return NextResponse.redirect(to);
}
