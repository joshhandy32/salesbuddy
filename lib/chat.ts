import Anthropic from "@anthropic-ai/sdk";
import type { SavedBrief } from "./types";

// Sonnet — low per-call cost.
const MODEL = "claude-sonnet-4-6";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a sharp sales strategist helping an AE think through ONE specific deal. You already have the discovery materials and the brief generated from them. Answer the rep's follow-up questions — likely objections, multi-threading, next steps, risks, messaging — grounded in what's actually in the transcript and brief. Be direct and specific to this deal: cite what was said. No filler, no generic playbook advice, no em-dashes. If the materials don't support an answer, say what's missing and what the rep should find out next. Keep answers tight — a few sentences or a short list.`;

function contextBlock(brief: SavedBrief): string {
  const r = brief.corrected ?? brief.result;
  const deal = [
    brief.company && `Company: ${brief.company}`,
    brief.dealSize && `Deal size: ${brief.dealSize}`,
    brief.industry && `Industry: ${brief.industry}`,
    brief.aeName && `AE: ${brief.aeName}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    deal && `=== DEAL ===\n${deal}`,
    `=== PROSPECT EMAIL ===\n${brief.email || "(none)"}`,
    `=== CALL TRANSCRIPT ===\n${brief.transcript || "(none)"}`,
    `=== BDR NOTES ===\n${brief.notes || "(none)"}`,
    `=== GENERATED BRIEF ===\n${JSON.stringify(r)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Answer a follow-up question grounded in this brief's materials. */
export async function answerFollowUp(
  brief: SavedBrief,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      {
        type: "text",
        // Deal context is stable across the session, so cache it.
        text: `Everything you know about this deal:\n\n${contextBlock(brief)}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "I couldn't generate a response — try rephrasing.";
}
