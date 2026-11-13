"use client";

import { useActionState, useId, useState } from "react";
import { saveMarketingSiteAction, type MarketingSiteResult } from "@/app/(app)/[org]/[project]/marketing/actions";
import type { ProjectRef } from "@/lib/project-paths";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue";
const field = "w-full rounded-xl border border-zk-border bg-zk-surface px-4 text-base text-zk-text placeholder:text-zk-muted focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20";
const primary = `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

/**
 * The Marketing home (#marketing-home): a project without a website first asks
 * for the one to improve the marketing for; after that it asks what marketing
 * problem to fix.
 */
export function MarketingHome({ slug, siteUrl, canSetSite }: { slug: ProjectRef; siteUrl: string | null; canSetSite: boolean }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-1 pb-16 pt-10 text-center sm:pt-16">
      {siteUrl ? <PromptStep siteUrl={siteUrl} /> : canSetSite ? <SiteStep slug={slug} /> : <SiteMissing />}
    </section>
  );
}

function SiteStep({ slug }: { slug: ProjectRef }) {
  const [result, action, pending] = useActionState<MarketingSiteResult | undefined, FormData>(saveMarketingSiteAction.bind(null, slug), undefined);
  const inputId = useId();
  const errorId = useId();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">Which website should we market?</h1>
        <p className="text-zk-muted">Add your site&apos;s address so Ziki knows what it is improving. You can change it later in Project settings.</p>
      </header>
      <form action={action} className="flex w-full max-w-xl flex-col gap-2 text-left">
        <label htmlFor={inputId} className="text-sm font-bold text-zk-text">Website address</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            name="siteUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            required
            autoFocus
            placeholder="https://yourproduct.com"
            aria-invalid={result?.error ? true : undefined}
            aria-describedby={result?.error ? errorId : undefined}
            className={`${field} min-h-11`}
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Saving…" : "Continue"}
          </button>
        </div>
        {result?.error ? <p id={errorId} role="alert" className="text-sm text-zk-bad-fg">{result.error}</p> : null}
      </form>
    </>
  );
}

function SiteMissing() {
  return (
    <header className="space-y-2">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">No website yet</h1>
      <p className="text-zk-muted">An organisation owner or admin needs to add the project&apos;s website before Marketing can help with it.</p>
    </header>
  );
}

function PromptStep({ siteUrl }: { siteUrl: string }) {
  const [prompt, setPrompt] = useState("");
  const inputId = useId();
  const hintId = useId();
  return (
    <>
      <header className="space-y-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">What marketing problem should we fix?</h1>
        <p className="text-zk-muted">
          For{" "}
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={`rounded-sm font-semibold text-zk-accent hover:underline ${focus}`}>
            {siteUrl.replace(/^https:\/\//, "").replace(/\/$/, "")}
          </a>
        </p>
      </header>
      {/* The assistant that answers isn't built yet: the prompt is kept here, nothing is sent. */}
      <form onSubmit={(event) => event.preventDefault()} className="w-full text-left">
        <label htmlFor={inputId} className="sr-only">Describe the marketing problem</label>
        <div className="rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-sm focus-within:border-electric-blue focus-within:ring-2 focus-within:ring-electric-blue/20">
          <textarea
            id={inputId}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            autoFocus
            placeholder="For example: people visit the pricing page but few sign up"
            aria-describedby={hintId}
            className="block w-full resize-none bg-transparent px-3 py-2 text-base text-zk-text placeholder:text-zk-muted focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <p id={hintId} className="text-xs text-zk-muted">The marketing assistant is coming soon.</p>
            <button type="submit" disabled className={primary}>Send</button>
          </div>
        </div>
      </form>
    </>
  );
}
