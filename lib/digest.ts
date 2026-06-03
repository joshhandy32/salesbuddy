import Anthropic from "@anthropic-ai/sdk";
import type { BriefResult, SavedBrief } from "./types";

// Sonnet — low per-call cost, as requested (not Opus).
const MODEL = "claude-sonnet-4-6";

// ── Data aggregation (no AI) ─────────────────────────────────────────────────
export type CorrectedFieldCount = { field: string; count: number };
export type LowRatedBrief = {
  dealSummary: string;
  rating: number;
  improveNext: string;
};

export type RepDigest = {
  repName: string;
  briefCount: number;
  ratedCount: number;
  avgRating: number | null;
  trend: "improving" | "sliding" | "steady" | "insufficient";
  improveNotes: string[];
  qualificationGaps: string[];
  correctedFields: CorrectedFieldCount[];
  lowRated: LowRatedBrief[];
  feedbackNotes: string[];
};

/** Which top-level fields the rep changed between the AI output and their edit. */
function changedFieldKeys(ai: BriefResult, c: BriefResult): string[] {
  const keys: string[] = [];
  const a = ai.aeBrief;
  const b = c.aeBrief;
  if (a.dealSummary !== b.dealSummary) keys.push("deal summary");
  if (a.whyNow !== b.whyNow) keys.push("why now");
  if (a.suggestedOpener !== b.suggestedOpener) keys.push("suggested opener");
  if (JSON.stringify(a.bant) !== JSON.stringify(b.bant)) keys.push("BANT");
  if (JSON.stringify(a.room) !== JSON.stringify(b.room))
    keys.push("who's in the room");
  if (JSON.stringify(a.risks) !== JSON.stringify(b.risks)) keys.push("risks");
  const ac = ai.bdrCoaching;
  const bc = c.bdrCoaching;
  if (ac.didWell !== bc.didWell) keys.push("coaching: did well");
  if (ac.improveNext !== bc.improveNext) keys.push("coaching: improve next");
  if (ac.qualificationGap !== bc.qualificationGap)
    keys.push("coaching: qualification gap");
  return keys;
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Group briefs by rep and compute the rollup + evidence used for coaching. */
export function buildRepDigests(briefs: SavedBrief[]): RepDigest[] {
  const groups = new Map<string, SavedBrief[]>();
  for (const b of briefs) {
    const key = b.repName?.trim() || "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const out: RepDigest[] = [];
  for (const [repName, list] of groups) {
    const sorted = [...list].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const rated = sorted.filter(
      (b): b is SavedBrief & { rating: number } => b.rating != null,
    );
    const avgRating = rated.length ? avg(rated.map((b) => b.rating)) : null;

    // Trend: recent half vs earlier half of rated briefs.
    let trend: RepDigest["trend"] = "insufficient";
    if (rated.length >= 2) {
      const mid = Math.floor(rated.length / 2);
      const earlier = rated.slice(0, mid || 1).map((b) => b.rating);
      const recent = rated.slice(mid).map((b) => b.rating);
      const diff = avg(recent) - avg(earlier);
      trend = diff > 0.25 ? "improving" : diff < -0.25 ? "sliding" : "steady";
    }

    // Tally which fields the rep corrects most.
    const tally = new Map<string, number>();
    for (const b of sorted) {
      if (b.corrected) {
        for (const k of changedFieldKeys(b.result, b.corrected)) {
          tally.set(k, (tally.get(k) || 0) + 1);
        }
      }
    }
    const correctedFields = [...tally.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    out.push({
      repName,
      briefCount: sorted.length,
      ratedCount: rated.length,
      avgRating,
      trend,
      improveNotes: sorted
        .map((b) => b.result.bdrCoaching.improveNext)
        .filter(Boolean),
      qualificationGaps: sorted
        .map((b) => b.result.bdrCoaching.qualificationGap)
        .filter(Boolean),
      correctedFields,
      lowRated: rated
        .filter((b) => b.rating <= 2)
        .map((b) => ({
          dealSummary: b.result.aeBrief.dealSummary,
          rating: b.rating,
          improveNext: b.result.bdrCoaching.improveNext,
        })),
      feedbackNotes: sorted
        .map((b) => b.feedbackNote?.trim())
        .filter((x): x is string => !!x),
    });
  }

  return out.sort((a, b) => b.briefCount - a.briefCount);
}

// ── AI synthesis (Sonnet) ────────────────────────────────────────────────────
// PROMPT — edit the manager's voice/instructions here.
const SYSTEM_PROMPT = `You are a sales manager reviewing your team's discovery-call briefs to coach each BDR. You write like a sharp, direct sales leader: specific, grounded in the rep's actual data, and free of filler or generic advice ("keep it up", "work on discovery"). Never invent a pattern that isn't in the evidence.

For each rep you'll receive a digest built from their stored briefs: how many briefs, average rating and trend, the recurring "improve next time" notes and qualification gaps the AI flagged on their calls, the brief fields the rep's manager corrected (and how often), their low-rated briefs, and any feedback notes.

Your job, per rep: name the ONE highest-leverage thing that rep should work on next — in a single sentence — drawn from the strongest recurring pattern in their data. The kind of reasoning (not templates to copy): if their suggested openers keep getting rewritten, the priority is sharpening openers; if "need" or budget keeps recurring as the qualification gap, the priority is probing that on the call. Tie it to what the data actually shows.

If a rep has thin data (e.g., one brief, no ratings, no corrections), say plainly it's too early to call a pattern and the priority is to log more reps — don't manufacture a weakness.

Then give the team-level read: the single most common qualification gap across all reps, and one sentence the manager should take away this week.

Return ONLY by calling the submit_digest tool. One sentence per rep; no prose outside the tool call.`;

function repBlock(d: RepDigest): string {
  const lines: string[] = [];
  const ratingStr =
    d.avgRating != null ? `${d.avgRating.toFixed(1)}/5` : "unrated";
  lines.push(`=== REP: ${d.repName} ===`);
  lines.push(
    `Briefs: ${d.briefCount} · Rated: ${d.ratedCount} · Avg rating: ${ratingStr} · Trend: ${d.trend}`,
  );
  if (d.improveNotes.length) {
    lines.push(`Recurring "improve next time" notes:`);
    d.improveNotes.slice(0, 5).forEach((n) => lines.push(`  • ${n}`));
  }
  if (d.qualificationGaps.length) {
    lines.push(`Qualification gaps flagged across briefs:`);
    d.qualificationGaps.slice(0, 5).forEach((g) => lines.push(`  • ${g}`));
  }
  if (d.correctedFields.length) {
    lines.push(
      `Fields the rep corrected on the AI output: ${d.correctedFields
        .map((f) => `${f.field} ×${f.count}`)
        .join(", ")}`,
    );
  }
  if (d.lowRated.length) {
    lines.push(`Low-rated briefs (≤2/5): ${d.lowRated.length}`);
    d.lowRated
      .slice(0, 3)
      .forEach((b) =>
        lines.push(`  • (${b.rating}/5) ${b.dealSummary} — note: ${b.improveNext}`),
      );
  }
  if (d.feedbackNotes.length) {
    lines.push(`Feedback notes left:`);
    d.feedbackNotes.slice(0, 3).forEach((f) => lines.push(`  • ${f}`));
  }
  return lines.join("\n");
}

function buildUserMessage(digests: RepDigest[]): string {
  return [
    "Here is the team's brief data, grouped by rep.",
    "",
    digests.map(repBlock).join("\n\n"),
    "",
    "Produce one coaching priority per rep, plus the team's most common qualification gap and a one-sentence takeaway, by calling submit_digest.",
  ].join("\n");
}

const SUBMIT_DIGEST_TOOL: Anthropic.Tool = {
  name: "submit_digest",
  description:
    "Submit per-rep coaching priorities and the team-level read for this sales team.",
  input_schema: {
    type: "object",
    properties: {
      reps: {
        type: "array",
        description: "One entry per rep, in the order provided.",
        items: {
          type: "object",
          properties: {
            repName: { type: "string" },
            priority: {
              type: "string",
              description:
                "One specific, evidence-grounded coaching sentence — the single highest-leverage thing this rep should work on next.",
            },
          },
          required: ["repName", "priority"],
        },
      },
      teamCommonGap: {
        type: "string",
        description:
          "The single most common qualification gap across the whole team.",
      },
      teamTakeaway: {
        type: "string",
        description: "One sentence the manager should take away this week.",
      },
    },
    required: ["reps", "teamCommonGap", "teamTakeaway"],
  },
};

export type DigestResult = {
  reps: { repName: string; priority: string }[];
  teamCommonGap: string;
  teamTakeaway: string;
};

/** Call Sonnet to synthesize coaching priorities from the rep digests. */
export async function generateCoaching(
  digests: RepDigest[],
): Promise<DigestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SUBMIT_DIGEST_TOOL],
    tool_choice: { type: "tool", name: "submit_digest" },
    messages: [{ role: "user", content: buildUserMessage(digests) }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a submit_digest call.");
  return toolUse.input as DigestResult;
}
