// Email Outreach drafting (Module: Email Outreach).
// Generates a short, personalized cold/follow-up email for a contact via one
// forced Anthropic tool call. Drafting only — the app never sends; the rep
// copies it or logs it as an outreach activity.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export type OutreachInput = {
  contactName: string;
  title?: string | null;
  company?: string | null;
  industry?: string | null;
  goal: string; // what the rep wants from this email
  tone?: string; // e.g. "direct", "warm", "casual"
  kind?: "cold" | "followup" | "breakup";
};

export type OutreachDraft = { subject: string; body: string };

const SYSTEM_PROMPT = `You write outbound sales emails the way a top SDR does: short, specific, and human. The rep will read, tweak, and send it themselves.

Hard rules:
- Keep it tight. 3 to 5 sentences of body, max. Busy people skim.
- One clear ask at the end (a question or a low-friction next step). Never stack CTAs.
- Make it about the prospect, not the product. Lead with their world, their role, their likely problem.
- Sound like a real person typed it fast. No corporate filler, no "I hope this email finds you well", no "I wanted to reach out", no em-dashes, no buzzwords, no fake flattery.
- Subject line: under 6 words, lowercase or sentence case, specific, no clickbait, no emojis.
- Use the prospect's name naturally. If you don't have a real personalization detail, stay honest and role-relevant rather than inventing specifics.

You'll be told the kind of email (cold intro, follow-up, or break-up), the goal, and an optional tone. Match them. Return ONLY by calling submit_outreach.`;

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_outreach",
  description: "Submit the drafted outreach email.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Under 6 words, specific, no emojis." },
      body: {
        type: "string",
        description:
          "3-5 sentence body ending in one clear ask. Plain, human, prospect-focused. No filler, no em-dashes.",
      },
    },
    required: ["subject", "body"],
  },
};

function buildUserMessage(i: OutreachInput): string {
  const kind =
    i.kind === "followup" ? "a follow-up email" : i.kind === "breakup" ? "a break-up email" : "a cold intro email";
  const lines = [
    `Write ${kind}.`,
    "",
    "Prospect:",
    `- Name: ${i.contactName}`,
    i.title ? `- Title: ${i.title}` : "",
    i.company ? `- Company: ${i.company}` : "",
    i.industry ? `- Industry: ${i.industry}` : "",
    "",
    `Goal of the email: ${i.goal.trim() || "open a conversation and book a short call"}`,
    i.tone ? `Tone: ${i.tone}` : "",
    "",
    "Draft it now by calling submit_outreach.",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function generateOutreach(input: OutreachInput): Promise<OutreachDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [SUBMIT_TOOL],
    tool_choice: { type: "tool", name: "submit_outreach" },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a submit_outreach call.");
  return toolUse.input as OutreachDraft;
}
