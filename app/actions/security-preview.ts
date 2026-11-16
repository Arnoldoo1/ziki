"use server";

import { promises as dns } from "node:dns";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { previewScan } from "@/lib/security-checks/preview";
import { summarisePreview, type PreviewSummary } from "@/lib/security-checks/preview-summary";

export type PublicScanAnswer = { ok: true; summary: PreviewSummary } | { ok: false; reason: string };

/**
 * The quick scan behind the box on the public Ziki Security page
 * (#security-checks, part C2). Code only, no AI, using Dave's preview scan:
 * rate-limited per visitor (the signed-in person, else their address), and it
 * returns counts only, never what was found.
 */
export async function runPublicScan(link: string): Promise<PublicScanAnswer> {
  const session = await auth();
  const result = await previewScan(typeof link === "string" ? link : "", { visitor: await visitorKey(session?.user?.id) });
  if (!result.ok) return { ok: false, reason: result.reason };
  const summary = summarisePreview(result);
  return { ok: true, summary: summary.kind === "website" ? { ...summary, ip: await siteAddress(summary.target) } : summary };
}

/**
 * The site's IP address, for the result's heading (SecurityHeaders, Sucuri and SSL Labs all show it). IPv4 first,
 * like they do. Null when it can't be found in time: the result never waits on it for long.
 */
async function siteAddress(target: string): Promise<string | null> {
  const host = target.replace(/^https?:\/\//i, "").split(/[/:?#]/)[0];
  if (!host) return null;
  try {
    const found = await Promise.race([
      dns.lookup(host, { all: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 2000)),
    ]);
    return (found.find((entry) => entry.family === 4) ?? found[0])?.address ?? null;
  } catch {
    return null;
  }
}

/** Who to count scans against: the person when signed in, else the address Cloudflare saw (which a visitor can't fake). */
async function visitorKey(userId: string | undefined): Promise<string> {
  if (userId) return `user:${userId}`;
  const list = await headers();
  const address = list.get("cf-connecting-ip") ?? list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${address || "unknown"}`;
}
