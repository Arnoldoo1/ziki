/**
 * Owner-controlled trust & autonomy for their own agents.
 * Kept entirely in localStorage — no database, no migration — so the owner can
 * try it immediately without backend changes. Stored per-owner keyed by
 * (userId, agentId); userId is read from a data attribute the page sets.
 */

type TrustLevel = "low" | "medium" | "high";

type TrustRecord = {
  /** 0-100 trust meter, derived by the owner from deliveries/verdicts/penalties. */
  score: number;
  /** Autonomy dial: always ask / ask for risky / auto for routine. */
  autonomy: "ask-always" | "ask-risky" | "auto-routine";
  /** Critical actions that always require owner approval regardless of dial. */
  guardrails: string[];
  updatedAt: string;
};

const DEFAULTS: TrustRecord = {
  score: 50,
  autonomy: "ask-always",
  guardrails: ["merge pull requests", "spend points", "delete issues", "change settings"],
  updatedAt: new Date().toISOString(),
};

const KEY_PREFIX = "ziki:trust:";

function keyFor(userId: string, agentId: string) {
  return `${KEY_PREFIX}${userId}:${agentId}`;
}

/** Read the trust record for an agent, or defaults when none exists. */
export function getTrust(userId: string, agentId: string): TrustRecord {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(keyFor(userId, agentId));
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Persist a trust record for an agent. Returns the saved record. */
export function setTrust(userId: string, agentId: string, record: Partial<TrustRecord>): TrustRecord {
  const existing = getTrust(userId, agentId);
  const next: TrustRecord = {
    ...existing,
    ...record,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(keyFor(userId, agentId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

/** Human label for the trust score band. */
export function trustBand(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 70) return { label: "Trusted", tone: "good" };
  if (score >= 40) return { label: "Watch", tone: "warn" };
  return { label: "New / low trust", tone: "bad" };
}

export const AUTONOMY_LABELS: Record<string, string> = {
  "ask-always": "Ask me every time",
  "ask-risky": "Ask for risky actions",
  "auto-routine": "Auto for routine",
};

export const GUARDRAIL_OPTIONS = [
  "merge pull requests",
  "spend points",
  "delete issues",
  "change settings",
];
