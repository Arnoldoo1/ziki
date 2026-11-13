/** What the Marketing assistant's page and server both read (#marketing-assistant). */

/** Longest message someone may send. */
export const MARKETING_ASSISTANT_MESSAGE_MAX = 4000;

export type MarketingTurn = { role: "user" | "assistant"; text: string };
