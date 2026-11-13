"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { askMarketingAssistantAction, saveMarketingSiteAction, type MarketingSiteResult } from "@/app/(app)/[org]/[project]/marketing/actions";
import { MARKETING_ASSISTANT_MESSAGE_MAX, type MarketingTurn } from "@/lib/marketing/assistant-limits";
import type { ProjectRef } from "@/lib/project-paths";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue";
const field = "w-full rounded-xl border border-zk-border bg-zk-surface px-4 text-base text-zk-text placeholder:text-zk-muted focus:border-electric-blue focus:outline-none focus:ring-2 focus:ring-electric-blue/20";
const primary = `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;

/**
 * The Marketing home (#marketing-home): a project without a website first asks
 * for the one to improve the marketing for; after that it asks what marketing
 * problem to fix, and the assistant answers.
 */
export function MarketingHome({ slug, siteUrl, isAdmin }: { slug: ProjectRef; siteUrl: string | null; isAdmin: boolean }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-1 pb-16 pt-10 text-center sm:pt-16">
      {siteUrl ? <PromptStep slug={slug} siteUrl={siteUrl} canChat={isAdmin} /> : isAdmin ? <SiteStep slug={slug} /> : <SiteMissing />}
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

/** Organisation owners and admins talk to the assistant; others see why they can't. */
function PromptStep({ slug, siteUrl, canChat }: { slug: ProjectRef; siteUrl: string; canChat: boolean }) {
  const [turns, setTurns] = useState<MarketingTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const site = siteUrl.replace(/^https:\/\//, "").replace(/\/$/, "");
  const started = turns.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [turns.length, pending]);

  function send() {
    const text = prompt.trim();
    if (!text || pending) return;
    const history: MarketingTurn[] = [...turns, { role: "user", text }];
    setTurns(history);
    setPrompt("");
    setError(null);
    startTransition(async () => {
      let answer: Awaited<ReturnType<typeof askMarketingAssistantAction>>;
      try {
        answer = await askMarketingAssistantAction(slug, history);
      } catch {
        answer = { ok: false, error: "The message couldn't be sent. Check your connection and try again." };
      }
      if (answer.ok) {
        setTurns([...history, { role: "assistant", text: answer.reply }]);
      } else {
        // Put the message back so it can be sent again.
        setTurns(turns);
        setPrompt(text);
        setError(answer.error);
      }
      inputRef.current?.focus();
    });
  }

  function startOver() {
    setTurns([]);
    setPrompt("");
    setError(null);
    inputRef.current?.focus();
  }

  const header = (
    <header className="space-y-2">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-zk-text">What marketing problem should we fix?</h1>
      <p className="text-zk-muted">
        For{" "}
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={`rounded-sm font-semibold text-zk-accent hover:underline ${focus}`}>
          {site}
        </a>
      </p>
    </header>
  );

  if (!canChat) {
    return (
      <>
        {header}
        <p className="text-zk-muted">Only organisation owners and admins can use the marketing assistant.</p>
      </>
    );
  }

  return (
    <>
      {started ? (
        <div className="flex w-full items-center justify-between gap-3 text-left">
          <p className="text-sm text-zk-muted">
            Marketing{" "}
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={`rounded-sm font-semibold text-zk-accent hover:underline ${focus}`}>
              {site}
            </a>
          </p>
          <button type="button" onClick={startOver} disabled={pending} className={`rounded-full border border-zk-border bg-zk-surface px-4 py-2 text-sm font-bold text-zk-text transition hover:bg-zk-chip disabled:opacity-50 ${focus}`}>
            New conversation
          </button>
        </div>
      ) : header}

      {started ? (
        <ol aria-label="Conversation" className="flex w-full flex-col gap-4 text-left">
          {turns.map((turn, index) => (
            <li key={index} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={turn.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-zk-tint px-4 py-3 text-zk-text"
                  : "max-w-full whitespace-pre-wrap break-words px-1 leading-relaxed text-zk-text"}
              >
                <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>
                {turn.text}
              </div>
            </li>
          ))}
          {pending ? (
            <li className="flex justify-start">
              <p role="status" className="px-1 text-zk-muted motion-safe:animate-pulse">Thinking…</p>
            </li>
          ) : null}
        </ol>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="w-full text-left"
      >
        <label htmlFor={inputId} className="sr-only">{started ? "Reply to the assistant" : "Describe the marketing problem"}</label>
        <div className="rounded-2xl border border-zk-border bg-zk-surface p-2 shadow-sm focus-within:border-electric-blue focus-within:ring-2 focus-within:ring-electric-blue/20">
          <textarea
            id={inputId}
            ref={inputRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            rows={started ? 2 : 4}
            maxLength={MARKETING_ASSISTANT_MESSAGE_MAX}
            autoFocus
            placeholder={started ? "Reply…" : "For example: people visit the pricing page but few sign up"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="block w-full resize-none bg-transparent px-3 py-2 text-base text-zk-text placeholder:text-zk-muted focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <p id={hintId} className="text-xs text-zk-muted">Enter to send, Shift+Enter for a new line.</p>
            <button type="submit" disabled={pending || !prompt.trim()} className={primary}>
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
        {error ? <p id={errorId} role="alert" className="mt-2 text-sm text-zk-bad-fg">{error}</p> : null}
      </form>
      <div ref={endRef} />
    </>
  );
}
