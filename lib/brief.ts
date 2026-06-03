import Anthropic from "@anthropic-ai/sdk";
import type { BriefInput, BriefResult } from "./types";

// Model used for brief generation. Sonnet 4.6 — strong reasoning + fast.
const MODEL = "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// PROMPT — edit the voice/instructions here. This is the single source of truth.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a senior B2B sales leader reviewing a discovery-call handoff from a BDR to an Account Executive. You write the way a seasoned VP of Sales talks in a deal review: direct, specific, and grounded in evidence from the materials.

Hard rules on voice:
- No filler, no hedging, no AI throat-clearing. Never write "Based on the provided materials", "It appears that", "I'd be happy to", or similar.
- Every claim ties back to what is actually in the email, transcript, or notes. If something isn't there, say so plainly — do not infer or invent.
- Short, load-bearing sentences. Cut every word that isn't pulling weight.

You produce TWO separate work products for TWO different readers:
1. AE Brief — for the Account Executive to read in the five minutes before the meeting. Skimmable and decision-ready.
2. BDR Coaching Note — private feedback for the BDR who ran the discovery. Honest and specific, the kind you'd give in a 1:1.

Rules on substance:
- BANT evidence must be a direct quote pulled from the materials. If a dimension never came up, mark it not surfaced — never fabricate a quote.
- For "who's in the room", only list people actually named or clearly referenced. Judge champion vs. blocker from their words and behavior, not their title alone.
- The suggested opener is one or two sentences the AE could say verbatim. It must reference something specific from the discovery, not generic rapport.
- Risks are the things most likely to kill or stall the deal, ranked hardest-hitting first.
- Coaching is for the BDR's growth: one genuine strength, one concrete thing to do differently next time, and the single qualification gap they most should have probed.

Calibrating to the deal:
- You may be given deal metadata (company, deal size, industry, AE). Use it to frame the brief — a small deal at an early-stage startup is run differently from a large deal at a mature enterprise. Let it shape urgency, risk framing, and the opener; don't just restate the metadata back.

Writing the follow-up email:
- Draft a short follow-up the AE could send right after the meeting: a subject line and a body of at most three sentences, ending with one clear next step.
- It must reference something specific from this deal, never generic. Sound like a real person typed it quickly — direct and warm. No AI filler ("I hope this finds you well", "I wanted to reach out"), no em-dashes, no parallel sentence fragments, no buzzwords. Plain language.

Using memory:
- You may be given a MEMORY section with the rep's past briefs — deal summaries, the coaching you gave, their ratings, and any edits or feedback they left. When it's present, use it two ways: (1) reference a past call only when it genuinely connects to the current deal — same account, same people, or a real pattern across the rep's deals; (2) treat the rep's edits and feedback as direction — if they rewrote your output or flagged a miss, match what they preferred and don't repeat it.
- Never invent continuity. If nothing in memory is relevant, ignore it.

Return your answer ONLY by calling the submit_brief tool. Do not write any prose outside the tool call.`;

function buildUserMessage(
  input: BriefInput,
  memoryBlock?: string | null,
): string {
  const { email, transcript, notes, company, dealSize, industry, aeName } = input;
  const section = (label: string, value: string) =>
    `=== ${label} ===\n${value.trim() || "(none provided)"}`;

  const parts: string[] = [];

  // Memory (if any) comes first so the model reads it before the new materials.
  if (memoryBlock) {
    parts.push(memoryBlock, "");
  }

  const dealBits = [
    company?.trim() && `Company: ${company.trim()}`,
    dealSize?.trim() && `Deal size: ${dealSize.trim()}`,
    industry?.trim() && `Industry: ${industry.trim()}`,
    aeName?.trim() && `AE: ${aeName.trim()}`,
  ].filter(Boolean);
  if (dealBits.length) {
    parts.push("=== DEAL ===", dealBits.join("\n"), "");
  }

  parts.push(
    "Here are the raw materials from a discovery-call handoff.",
    "",
    section("PROSPECT EMAIL", email),
    "",
    section("CALL TRANSCRIPT", transcript),
    "",
    section("BDR NOTES", notes),
    "",
    "Produce the AE Brief, BDR Coaching Note, and Follow-Up Email by calling submit_brief.",
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// TOOL SCHEMA — forces the model to return JSON in exactly this shape.
// Mirrors BriefResult in ./types.ts. Keep the two in sync.
// ---------------------------------------------------------------------------
const bantDimensionSchema = {
  type: "object" as const,
  properties: {
    surfaced: {
      type: "boolean",
      description: "Whether this dimension actually came up in the materials.",
    },
    evidence: {
      type: "string",
      description:
        "The supporting direct quote when surfaced; otherwise a short 'Not surfaced' note. Do not wrap it in quotation marks — the UI adds them.",
    },
  },
  required: ["surfaced", "evidence"],
};

const SUBMIT_BRIEF_TOOL: Anthropic.Tool = {
  name: "submit_brief",
  description:
    "Submit the structured AE Brief and BDR Coaching Note for this deal handoff.",
  input_schema: {
    type: "object",
    properties: {
      aeBrief: {
        type: "object",
        properties: {
          dealSummary: { type: "string", description: "One-line deal summary." },
          bant: {
            type: "object",
            properties: {
              budget: bantDimensionSchema,
              authority: bantDimensionSchema,
              need: bantDimensionSchema,
              timeline: bantDimensionSchema,
            },
            required: ["budget", "authority", "need", "timeline"],
          },
          whyNow: {
            type: "string",
            description: "The trigger / urgency — why this is moving now.",
          },
          room: {
            type: "array",
            description: "People actually named or clearly referenced.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                role: { type: "string" },
                disposition: {
                  type: "string",
                  enum: ["champion", "blocker", "neutral"],
                },
                reason: {
                  type: "string",
                  description: "Why they're champion/blocker/neutral, from their words.",
                },
              },
              required: ["name", "role", "disposition", "reason"],
            },
          },
          suggestedOpener: {
            type: "string",
            description: "One or two sentences the AE could say verbatim.",
          },
          risks: {
            type: "array",
            description: "Top 2 risks or open questions, hardest-hitting first.",
            items: { type: "string" },
          },
        },
        required: [
          "dealSummary",
          "bant",
          "whyNow",
          "room",
          "suggestedOpener",
          "risks",
        ],
      },
      bdrCoaching: {
        type: "object",
        properties: {
          didWell: { type: "string", description: "What the BDR did well." },
          improveNext: {
            type: "string",
            description: "One specific thing to improve next time.",
          },
          qualificationGap: {
            type: "string",
            description: "A qualification gap they should have probed.",
          },
        },
        required: ["didWell", "improveNext", "qualificationGap"],
      },
      followUpEmail: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Email subject line." },
          body: {
            type: "string",
            description:
              "Body: at most three sentences ending in one clear next step. Plain, human, deal-specific. No em-dashes, no AI filler, no buzzwords.",
          },
        },
        required: ["subject", "body"],
      },
    },
    required: ["aeBrief", "bdrCoaching", "followUpEmail"],
  },
};

/**
 * Calls the Anthropic API and returns the structured brief.
 * Throws if the key is missing or the model doesn't return the expected tool call.
 */
export async function generateBrief(
  input: BriefInput,
  memoryBlock?: string | null,
): Promise<BriefResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Cache the static system prompt + tool definition across requests.
        // Memory is dynamic, so it lives in the user message — not here — to
        // keep this prefix cacheable.
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SUBMIT_BRIEF_TOOL],
    tool_choice: { type: "tool", name: "submit_brief" },
    messages: [{ role: "user", content: buildUserMessage(input, memoryBlock) }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return a submit_brief tool call.");
  }

  return toolUse.input as BriefResult;
}
