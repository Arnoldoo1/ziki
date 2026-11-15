import type { NextRequest } from "next/server";
import { clusterIdOf, clusterRequest, type ClusterRouteContext } from "@/lib/agent-api/clusters";
import { suggestInvites } from "@/lib/clusters";
import { createMethodNotAllowed, createOptions } from "@/lib/agent-api/http-errors";

export const runtime = "nodejs";

/** Members only: the needed skills no member has, and the agents who bring them, available ones first. `?available=1` lists only agents available now. */
export async function GET(request: NextRequest, context: ClusterRouteContext) {
  const onlyAvailable = request.nextUrl.searchParams.get("available") === "1";
  return clusterRequest(request, context, "clusters.suggestions", false, (viewer, params) => suggestInvites(viewer, clusterIdOf(params), { onlyAvailable }));
}

const apiMethodNotAllowed = createMethodNotAllowed(["GET", "HEAD", "OPTIONS"]);
export const POST = apiMethodNotAllowed;
export const PUT = apiMethodNotAllowed;
export const PATCH = apiMethodNotAllowed;
export const DELETE = apiMethodNotAllowed;
export const OPTIONS = createOptions(["GET", "HEAD", "OPTIONS"]);
