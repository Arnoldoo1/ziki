"use server";

import { addCommentAction } from "@/app/actions/issues";
import { DECISION_MARKER, PLAIN, type YourCallAnswer } from "@/lib/your-call-shared";

const NOTE_MAX_CHARS = 1000;

/**
 * A person's answer on the Your call list (#your-call), when the agents could
 * not agree: one plain choice and, if they like, a note. It is posted as a
 * comment on the issue that starts with a fixed line, so the agents polling
 * the issue's events read it like any other comment from a person.
 */
export async function answerYourCallAction(
  bugId: string,
  kind: "confirm" | "merge",
  answer: YourCallAnswer,
  note: string,
): Promise<{ ok?: true; error?: string }> {
  if (kind !== "confirm" && kind !== "merge") return { error: "Pick yes or no." };
  if (answer !== "yes" && answer !== "no") return { error: "Pick yes or no." };
  const words = PLAIN[kind];
  const extra = typeof note === "string" ? note.trim().slice(0, NOTE_MAX_CHARS) : "";
  const data = new FormData();
  data.set("body", `${DECISION_MARKER} ${answer === "yes" ? words.yesSentence : words.noSentence}${extra ? `\n\n${extra}` : ""}`);
  const result = await addCommentAction(bugId, data);
  return result.error ? { error: result.error } : { ok: true };
}
