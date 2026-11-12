"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addSecurityTarget, type AddTargetState } from "@/app/actions/security-checks";
import { TARGET_KIND_LABEL } from "@/lib/security-checks";
import { parseSecurityTarget, PRIVATE_TARGET_ERROR, TARGET_INPUT_MAX } from "@/lib/security-checks/target";

/**
 * The box on Security (#security-checks, Mark's 12 Nov call): the client types
 * what they want to secure and presses Enter, and the first, basic scan is
 * free. It looks like the Ideas box, but it doesn't chat or file an idea: it
 * adds the site. Ziki works out whether it's a website, server or repo, and
 * refuses private addresses.
 */
export function SecurityChat({ id = "security-chat", focusOnOpen = false }: { id?: string; focusOnOpen?: boolean }) {
  const [state, action, pending] = useActionState<AddTargetState, FormData>(addSecurityTarget, {});
  const [text, setText] = useState(state.input ?? "");
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const value = text.trim();
  const parsed = value ? parseSecurityTarget(value) : null;
  const target = parsed?.ok ? parsed.target : null;
  const isPrivate = parsed !== null && !parsed.ok && parsed.error === PRIVATE_TARGET_ERROR;
  const errorId = `${id}-error`;

  useEffect(() => {
    if (focusOnOpen) box.current?.focus();
  }, [focusOnOpen]);

  return (
    <div>
      <form
        ref={form}
        action={action}
        noValidate
      >
        <div className="rounded-[22px] border border-zk-border bg-zk-surface px-4 pb-2.5 pt-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)] focus-within:border-electric-blue-strong/50">
          <label htmlFor={id} className="sr-only">Website, server address or GitHub repo</label>
          <textarea
            id={id}
            ref={box}
            name="target"
            rows={1}
            value={text}
            disabled={pending}
            maxLength={TARGET_INPUT_MAX}
            placeholder="ziki.dev"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? errorId : `${id}-reading`}
            onChange={(event) => setText(event.target.value.replace(/\n/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (value) form.current?.requestSubmit();
              }
            }}
            className="block min-h-[28px] w-full resize-none border-0 bg-transparent p-1 text-[15px] leading-6 text-zk-text placeholder:text-zk-muted focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p id={`${id}-reading`} aria-live="polite" className="m-0 min-w-0 truncate px-1 text-[13px] text-zk-muted">
              {target ? (
                <span className="inline-flex items-center gap-1.5 text-zk-ok-fg">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                  {TARGET_KIND_LABEL[target.kind]}: <span className="font-semibold">{target.value}</span>
                </span>
              ) : isPrivate ? (
                <span className="text-zk-bad-fg">That&apos;s a private address</span>
              ) : value ? (
                "Keep typing"
              ) : (
                "A website, server address or GitHub repo"
              )}
            </p>
            <button
              type="submit"
              disabled={pending || !value}
              aria-label="Send"
              title="Send"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zk-text text-zk-surface transition disabled:opacity-30"
            >
              {pending ? (
                <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              )}
            </button>
          </div>
        </div>
        {state.error ? <p id={errorId} role="alert" className="m-0 mt-2 px-2 text-sm text-zk-bad-fg">{state.error}</p> : null}
      </form>
    </div>
  );
}
