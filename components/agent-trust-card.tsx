"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getTrust,
  setTrust,
  trustBand,
  AUTONOMY_LABELS,
  GUARDRAIL_OPTIONS,
  type AutonomyValue,
} from "@/lib/agent-trust";

type Props = {
  userId: string;
  agentId: string;
  agentName: string;
};

export function AgentTrustCard({ userId, agentId, agentName }: Props) {
  const [record, setRecord] = useState(() => getTrust(userId, agentId));
  const [editing, setEditing] = useState(false);

  const save = useCallback((next: Partial<Parameters<typeof setTrust>[2]>) => {
    const updated = setTrust(userId, agentId, next);
    setRecord(updated);
  }, [userId, agentId]);

  const { label, tone } = trustBand(record.score);

  return (
    <div className="rounded-2xl border border-zk-border bg-zk-surface p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zk-text">{agentName}</span>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              tone === "good"
                ? "bg-zk-ok-bg text-zk-ok-fg"
                : tone === "warn"
                ? "bg-zk-warn-bg text-zk-warn-fg"
                : "bg-zk-bad-bg text-zk-bad-fg"
            }`}
          >
            {label}
          </span>
        </div>
        <span className="ml-auto text-sm text-zk-muted font-mono">{record.score}</span>
      </div>

      <div className="w-full bg-zk-surface-2 rounded-lg h-2 overflow-hidden mb-3">
        <div
          className={`h-full ${tone === "good" ? "bg-zk-ok" : tone === "warn" ? "bg-zk-warn" : "bg-zk-bad"}`}
          style={{ width: Math.max(0, Math.min(100, record.score)) + "%" }}
          role="progressbar"
          aria-valuenow={record.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Trust ${record.score}`}
        />
      </div>

      <p className="text-xs text-zk-muted mb-3">
        Score set by you based on deliveries, test verdicts and penalties.
      </p>

      <div className="space-y-2 mb-3" role="radiogroup" aria-label="Autonomy dial">
        <span className="text-xs font-semibold text-zk-text block">Autonomy dial</span>
        <div className="flex gap-2">
          {Object.entries(AUTONOMY_LABELS).map(([value, labelText]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={record.autonomy === value}
              onClick={() => save({ autonomy: value as AutonomyValue })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold text-left ${
                record.autonomy === value
                  ? "bg-electric-blue-strong border-electric-blue-strong text-white"
                  : "border-zk-border bg-zk-surface text-zk-text hover:bg-zk-surface-2"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <span className="text-xs font-semibold text-zk-text block">Hard guardrails (always ask owner)</span>
        <div className="flex flex-wrap gap-2">
          {GUARDRAIL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                const has = record.guardrails.includes(g);
                save({
                  guardrails: has ? record.guardrails.filter((x) => x !== g) : [...record.guardrails, g],
                });
              }}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold text-left ${
                record.guardrails.includes(g)
                  ? "bg-electric-blue-strong border-electric-blue-strong text-white"
                  : "border-zk-border bg-zk-surface text-zk-text hover:bg-zk-surface-2"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs text-zk-muted">Critical actions always require your approval regardless of the dial.</p>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <span className="text-xs font-semibold text-zk-text block">Set score (0–100)</span>
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={record.score}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) save({ score: Math.max(0, Math.min(100, v)) });
            }}
            className="rounded-lg border border-zk-border bg-zk-surface px-2 py-1 text-xs text-zk-text w-20"
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditing(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        className="text-xs text-zk-accent underline-offset-2 hover:underline mt-2"
      >
        {editing ? "Cancel" : "Edit score"}
      </button>
    </div>
  );
}