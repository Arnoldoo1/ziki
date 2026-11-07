"use client";

import { useEffect, useState } from "react";
import { previewStatusAction } from "@/app/actions/previews";
import type { PreviewBuildView } from "@/lib/previews/builds";

export type PreviewCardProps = {
  bugId: string;
  build: PreviewBuildView;
  /** The last ready preview of this pull request, while a newer commit builds or after it failed. */
  lastReadyUrl: string | null;
  /** Members can ask for updates while it builds. */
  canFollow: boolean;
};

/** Ask again this often while the build runs. */
const POLL_MS = 15_000;

const LINK = "text-sm font-semibold text-zk-accent hover:underline";

/** The issue's pull request preview (#previews): Ziki's latest build of it, kept current while it builds. */
export function PreviewCard({ bugId, build: initialBuild, lastReadyUrl: initialLastReady, canFollow }: PreviewCardProps) {
  const [build, setBuild] = useState(initialBuild);
  const [lastReadyUrl, setLastReadyUrl] = useState(initialLastReady);
  const running = build.status === "queued" || build.status === "building";

  useEffect(() => {
    setBuild(initialBuild);
    setLastReadyUrl(initialLastReady);
  }, [initialBuild, initialLastReady]);

  useEffect(() => {
    if (!running || !canFollow) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const result = await previewStatusAction(bugId).catch(() => null);
      if (cancelled || !result?.ok || !result.build) return;
      setBuild(result.build);
      setLastReadyUrl(result.lastReadyUrl);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [bugId, running, canFollow]);

  const commit = build.headSha.slice(0, 7);
  const olderPreview = lastReadyUrl && lastReadyUrl !== build.url ? lastReadyUrl : null;

  return (
    <section aria-label="Preview" data-testid="preview" data-status={build.status} className="flex flex-col gap-2 rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-[22px]">
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-zk-text">Preview</span>
        <span className="font-mono text-xs text-zk-muted">@ {commit}</span>
        <span role="status" className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          build.status === "ready"
            ? "bg-zk-ok-bg text-zk-ok-fg"
            : build.status === "failed"
              ? "bg-zk-bad-bg text-zk-bad-fg"
              : "bg-zk-warn-bg text-zk-warn-fg"
        }`}>
          {build.status === "ready" ? "Ready" : build.status === "failed" ? "Build failed" : build.status === "queued" ? "Waiting to build" : "Building"}
        </span>
        {build.runUrl ? (
          <a href={build.runUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs font-semibold text-zk-muted hover:underline">
            Build log
          </a>
        ) : null}
      </header>

      {build.status === "ready" && build.url ? (
        <a href={build.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center self-start rounded-full bg-electric-blue-strong px-4 text-sm font-bold text-white hover:brightness-105">
          Open preview
        </a>
      ) : null}
      {running ? (
        <p className="m-0 text-sm text-zk-text2">
          Ziki is building this commit. It usually takes a minute or two.
        </p>
      ) : null}
      {build.status === "failed" ? (
        <p className="m-0 text-sm text-zk-bad-fg">{build.error ?? "The preview build failed."}</p>
      ) : null}
      {olderPreview && build.status !== "ready" ? (
        <a href={olderPreview} target="_blank" rel="noreferrer" className={LINK}>
          Open the last preview that built
        </a>
      ) : null}
      <p className="m-0 text-xs text-zk-muted">Anyone with the link can open a preview.</p>
    </section>
  );
}
