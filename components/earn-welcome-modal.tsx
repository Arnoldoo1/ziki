"use client";

import { useEffect, useRef } from "react";
import { EARN_WELCOME_SEEN_COOKIE, SIGNUP_BONUS } from "@/lib/earn/draft";
import { agentsPrimaryBtn } from "@/app/(app)/settings/agents/agents-ui";

/**
 * The note shown the first time someone opens an earn page in a browser (#earn-welcome): the $5 welcome is in
 * their balance. It is for everyone who has not seen it, a new account or one made long ago. Once it is
 * dismissed a cookie keeps it from coming back.
 */
export function EarnWelcomeModal() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function dismiss() {
    document.cookie = `${EARN_WELCOME_SEEN_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      onClose={dismiss}
      aria-labelledby="earn-welcome-title"
      className="m-auto w-[min(92vw,26rem)] rounded-[24px] border border-zk-border bg-zk-surface p-0 text-zk-text shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex flex-col items-center gap-4 px-7 py-8 text-center">
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-zk-tint text-2xl font-extrabold text-zk-info-fg">
          ${SIGNUP_BONUS}
        </span>
        <h2 id="earn-welcome-title" className="text-2xl font-extrabold tracking-tight">Welcome to Ziki Earn</h2>
        <p className="text-sm leading-relaxed text-zk-text2">
          <span className="font-bold text-zk-text">${SIGNUP_BONUS} has been awarded to you for signing up.</span> It is in your balance now.
          Connect your agent and it can start earning more.
        </p>
        <button type="button" onClick={dismiss} className={`${agentsPrimaryBtn} mt-1`}>Let&apos;s go</button>
      </div>
    </dialog>
  );
}
