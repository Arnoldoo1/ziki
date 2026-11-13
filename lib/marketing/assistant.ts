import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { MARKETING_ASSISTANT_MESSAGE_MAX, type MarketingTurn } from "@/lib/marketing/assistant-limits";

/**
 * The Marketing assistant (#marketing-assistant): someone describes a marketing
 * problem with their website and it answers. It only talks for now: it reads
 * nothing from the project and creates nothing.
 *
 * `ZIKI_AI_PROVIDER` picks the model:
 * - `openrouter`: OPENROUTER_API_KEY, OPENROUTER_MODEL (default a free model).
 * - `anthropic` (the default when unset): ZIKI_CLAUDE_API_KEY, as Ziki's other
 *   Claude features use.
 */

/** Most turns of history sent to the model; older ones are dropped. */
export const MARKETING_ASSISTANT_HISTORY_MAX = 20;
export type MarketingAnswer = { ok: true; reply: string } | { ok: false; error: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free";
const CLAUDE_MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 60_000;
const MAX_TOKENS = 2000;

const UNAVAILABLE = "The marketing assistant can't answer right now. Try again in a moment.";

function systemPrompt(siteUrl: string, projectName: string): string {
  return `You are Ziki's marketing assistant, in the Marketing section of the project "${projectName}". Its website is ${siteUrl}.

The person you are talking to works on this product and wants to fix a marketing problem with it: getting found, explaining the product, turning visitors into sign-ups or customers, keeping them, and similar.

- Ask a short question when you need to know more, such as who the customers are or what they have already tried.
- Give specific, practical advice they can act on, with a few concrete examples (headlines, posts, emails, page changes) when they help.
- You can't open or read the website: work from what they tell you, and never claim to have seen it.
- If they ask about something other than marketing this product, say you can only help with its marketing.

Write plainly, in the language they use. Use short paragraphs and simple dash lists. Don't use Markdown headings, bold, tables or code blocks.`;
}

/** Well-formed turns only, trimmed to the limits, starting and ending with the person. */
export function cleanMarketingHistory(history: unknown): MarketingTurn[] {
  if (!Array.isArray(history)) return [];
  const turns = history
    .filter((turn): turn is MarketingTurn =>
      typeof turn === "object" && turn !== null &&
      ((turn as MarketingTurn).role === "user" || (turn as MarketingTurn).role === "assistant") &&
      typeof (turn as MarketingTurn).text === "string",
    )
    .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, MARKETING_ASSISTANT_MESSAGE_MAX) }))
    .filter((turn) => turn.text)
    .slice(-MARKETING_ASSISTANT_HISTORY_MAX);
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

/** The assistant's reply to the conversation, whose last turn is the person's. */
export async function askMarketingAssistant(turns: MarketingTurn[], project: { name: string; siteUrl: string }): Promise<MarketingAnswer> {
  if (turns.at(-1)?.role !== "user") return { ok: false, error: "Describe the marketing problem first." };
  const system = systemPrompt(project.siteUrl, project.name);
  const provider = (process.env.ZIKI_AI_PROVIDER?.trim().toLowerCase() || "anthropic");
  if (provider === "openrouter") return askOpenRouter(system, turns);
  if (provider === "anthropic") return askClaude(system, turns);
  logger.error(`[marketing-assistant] ZIKI_AI_PROVIDER "${provider}" isn't supported here. Use "openrouter" or "anthropic".`);
  return { ok: false, error: "The marketing assistant isn't set up on this server." };
}

async function askOpenRouter(system: string, turns: MarketingTurn[]): Promise<MarketingAnswer> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    logger.error("[marketing-assistant] ZIKI_AI_PROVIDER is openrouter but OPENROUTER_API_KEY isn't set.");
    return { ok: false, error: "The marketing assistant isn't set up on this server." };
  }
  const model = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ziki.dev",
        "X-Title": "Ziki",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "system", content: system }, ...turns.map((turn) => ({ role: turn.role, content: turn.text }))],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    logger.error("[marketing-assistant] OpenRouter request failed.", error instanceof Error ? error.message : error);
    return { ok: false, error: UNAVAILABLE };
  }

  const body = await response.json().catch(() => null) as
    | { choices?: { message?: { content?: string | null }; finish_reason?: string }[]; error?: { message?: string } }
    | null;
  if (!response.ok) {
    logger.error(`[marketing-assistant] OpenRouter answered ${response.status}.`, body?.error?.message ?? "");
    if (response.status === 429) return { ok: false, error: "The marketing assistant is busy (rate limit reached). Try again in a minute." };
    return { ok: false, error: UNAVAILABLE };
  }
  const reply = body?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    logger.warn("[marketing-assistant] OpenRouter returned no text.", { model, finish: body?.choices?.[0]?.finish_reason });
    return { ok: false, error: UNAVAILABLE };
  }
  return { ok: true, reply };
}

async function askClaude(system: string, turns: MarketingTurn[]): Promise<MarketingAnswer> {
  const apiKey = process.env.ZIKI_CLAUDE_API_KEY?.trim();
  if (!apiKey) {
    logger.error("[marketing-assistant] ZIKI_CLAUDE_API_KEY isn't set.");
    return { ok: false, error: "The marketing assistant isn't set up on this server." };
  }
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages: turns.map((turn) => ({ role: turn.role, content: turn.text })),
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "The marketing assistant can't help with that." };
    const reply = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("").trim();
    return reply ? { ok: true, reply } : { ok: false, error: UNAVAILABLE };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      logger.warn("[marketing-assistant] Claude rate limit reached.");
      return { ok: false, error: "The marketing assistant is busy (rate limit reached). Try again in a minute." };
    }
    logger.error("[marketing-assistant] Claude failed.", error instanceof Anthropic.APIError ? `status ${error.status}` : error);
    return { ok: false, error: UNAVAILABLE };
  }
}
