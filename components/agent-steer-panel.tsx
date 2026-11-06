"use client";

import { useState, useTransition } from "react";
import { sendAgentSteerAction } from "@/app/actions/agent-steers";
import { setAgentPausedAction } from "@/app/(app)/settings/agents/actions";

export function AgentSteerPanel({ issueRef, agentId, agentName, paused, canPause, notes }: {
  issueRef: string; agentId: string; agentName: string; paused: boolean; canPause: boolean;
  notes: { id: string; body: string; plan: string | null; createdAt: string; acknowledgedAt: string | null; author: string }[];
}) {
  const [note, setNote] = useState("");
  const [isPaused, setIsPaused] = useState(paused);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <section className="rounded-2xl border border-zk-border bg-zk-surface p-4 space-y-3" aria-label="Steer the agent">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="font-bold text-zk-text">Steer the agent</h2><p className="text-xs text-zk-muted">Instructions are delivered to {agentName} on its next heartbeat.</p></div>
      {canPause ? <button type="button" disabled={pending} onClick={() => startTransition(async () => {
        const next = !isPaused; const result = await setAgentPausedAction(agentId, next);
        if (result.ok) { setIsPaused(next); setMessage(next ? "Agent paused." : "Agent resumed."); }
        else setMessage(result.error);
      })} className="rounded-full border border-zk-border px-3 py-2 text-sm font-semibold">{isPaused ? "Resume agent" : "Pause agent"}</button> : null}
    </div>
    {isPaused ? <p className="text-sm text-amber-700">This agent is paused. It must resume before continuing work.</p> : null}
    {notes.length ? <ol className="space-y-2 border-l-2 border-zk-border pl-3">{notes.map((entry) => <li key={entry.id} className="text-sm"><p className="text-zk-text">{entry.body}</p><p className="text-xs text-zk-muted">{entry.author} · {entry.acknowledgedAt ? `Acknowledged: ${entry.plan ?? "Plan received"}` : "Awaiting acknowledgement"}</p></li>)}</ol> : null}
    <form onSubmit={(event) => { event.preventDefault(); startTransition(async () => {
      const result = await sendAgentSteerAction(issueRef, note);
      if (result.ok) { setNote(""); setMessage("Steer sent. The agent will receive it on its next heartbeat."); }
      else setMessage(result.error);
    }); }} className="space-y-2">
      <label className="sr-only" htmlFor={`steer-${agentId}`}>Instruction for the agent</label>
      <textarea id={`steer-${agentId}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Tell the agent what to change or focus on…" className="w-full rounded-xl border border-zk-border bg-zk-bg p-3 text-sm text-zk-text" />
      <div className="flex items-center justify-between gap-3"><span aria-live="polite" className="text-xs text-zk-muted">{message}</span><button disabled={pending || !note.trim()} className="rounded-full bg-zk-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send steer</button></div>
    </form>
  </section>;
}
