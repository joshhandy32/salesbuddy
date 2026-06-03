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

Return your answer ONLY by calling the submit_brief tool. Do not write any prose outside the tool call.`;

function buildUserMessage({ email, transcript, notes }: BriefInput): string {
  const section = (label: string, value: string) =>
    `=== ${label} ===\n${value.trim() || "(none provided)"}`;

  return [
    "Here are the raw materials from a discovery-call handoff.",
    "",
    section("PROSPECT EMAIL", email),
    "",
    section("CALL TRANSCRIPT", transcript),
    "",
    section("BDR NOTES", notes),
    "",
    "Produce the AE Brief and BDR Coaching Note by calling submit_brief.",
  ].join("\n");
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
    },
    required: ["aeBrief", "bdrCoaching"],
  },
};

/**
 * Calls the Anthropic API and returns the structured brief.
 * Throws if the key is missing or the model doesn't return the expected tool call.
 */
export async function generateBrief(input: BriefInput): Promise<BriefResult> {
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
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SUBMIT_BRIEF_TOOL],
    tool_choice: { type: "tool", name: "submit_brief" },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return a submit_brief tool call.");
  }

  return toolUse.input as BriefResult;
}
