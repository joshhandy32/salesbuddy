import Anthropic from "@anthropic-ai/sdk";
import type { BriefResult, SavedBrief } from "./types";

// Sonnet — low per-call cost, as requested (not Opus).
const MODEL = "claude-sonnet-4-6";

const BANT_DIMS = ["budget", "authority", "need", "timeline"] as const;

// ── Data aggregation (no AI) ─────────────────────────────────────────────────
export type CorrectedFieldCount = { field: string; count: number };
export type LowRatedBrief = {
  dealSummary: string;
  rating: number;
  improveNext: string;
};
export type BantGap = { dimension: string; notSurfaced: number; total: number };

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
  bantNotSurfaced: BantGap[];
};

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
const repKey = (b: SavedBrief) => b.repName?.trim() || "Unassigned";

export function buildRepDigests(briefs: SavedBrief[]): RepDigest[] {
  const groups = new Map<string, SavedBrief[]>();
  for (const b of briefs) {
    const key = repKey(b);
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

    let trend: RepDigest["trend"] = "insufficient";
    if (rated.length >= 2) {
      const mid = Math.floor(rated.length / 2);
      const earlier = rated.slice(0, mid || 1).map((b) => b.rating);
      const recent = rated.slice(mid).map((b) => b.rating);
      const diff = avg(recent) - avg(earlier);
      trend = diff > 0.25 ? "improving" : diff < -0.25 ? "sliding" : "steady";
    }

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

    // How often each BANT dimension went unprobed across this rep's calls.
    const bantNotSurfaced = BANT_DIMS.map((dim) => ({
      dimension: dim,
      notSurfaced: sorted.filter((b) => !b.result.aeBrief?.bant?.[dim]?.surfaced).length,
      total: sorted.length,
    }))
      .filter((x) => x.notSurfaced > 0)
      .sort((a, b) => b.notSurfaced - a.notSurfaced);

    out.push({
      repName,
      briefCount: sorted.length,
      ratedCount: rated.length,
      avgRating,
      trend,
      improveNotes: sorted.map((b) => b.result.bdrCoaching?.improveNext).filter(Boolean),
      qualificationGaps: sorted
        .map((b) => b.result.bdrCoaching?.qualificationGap)
        .filter(Boolean),
      correctedFields,
      lowRated: rated
        .filter((b) => b.rating <= 2)
        .map((b) => ({
          dealSummary: b.result.aeBrief?.dealSummary ?? "",
          rating: b.rating,
          improveNext: b.result.bdrCoaching?.improveNext ?? "",
        })),
      feedbackNotes: sorted
        .map((b) => b.feedbackNote?.trim())
        .filter((x): x is string => !!x),
      bantNotSurfaced,
    });
  }

  return out.sort((a, b) => b.briefCount - a.briefCount);
}

// ── AI synthesis (Sonnet) ────────────────────────────────────────────────────
// PROMPT — edit the manager's voice/instructions here.
const SYSTEM_PROMPT = `You are a sales manager reviewing your team's discovery-call briefs to coach each BDR. You write like a sharp, direct sales leader: specific, grounded in the rep's actual data, and free of filler or generic advice ("keep it up", "work on discovery"). No em-dashes. Never invent a pattern that isn't in the evidence.

For each rep you'll receive: stats (brief count, avg rating, trend), recurring "improve next time" notes and qualification gaps the AI flagged, a tally of which BANT dimensions went unprobed across their calls, the brief fields their manager corrected (and how often), low-rated briefs, feedback notes, their previous coaching priority (if any), and their recent call transcripts.

Per rep, do three things:
1. Coaching priority — name the ONE highest-leverage thing this rep should work on next, in a single sentence, drawn from the strongest RECURRING pattern in the actual call content. Go beyond the notes and ratings: read the transcripts for questions they consistently skip, objections that recur, and qualification gaps that span multiple calls. Cite the evidence with counts, e.g. "budget was not surfaced in 4 of 6 recent calls" or "skips the timeline question whenever the prospect is enthusiastic". If a rep has thin data, say it's too early to call a pattern and the priority is to log more reps.
2. improvedOnLastPriority — if a previous priority is given, read their recent calls and judge whether they've made progress on that specific thing: "improving" if the recent calls show progress, "not_yet" if not. Use "na" if there was no previous priority.

Then, across the WHOLE team's transcripts and notes:
3. objections — identify the most common recurring objections prospects raise. For each: a short label, a one-line summary of how it shows up, and a suggested response approach synthesized from how it was handled in the highest-rated briefs where it appeared. Only include objections actually present in the data; order by how often they recur.

Also give the team's single most common qualification gap and one sentence the manager should take away this week.

Return ONLY by calling the submit_digest tool. One sentence per rep priority; no prose outside the tool call.`;

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n)}…[truncated]` : s;

function repBlock(
  d: RepDigest,
  transcripts: string[],
  previousPriority?: string,
): string {
  const lines: string[] = [];
  const ratingStr = d.avgRating != null ? `${d.avgRating.toFixed(1)}/5` : "unrated";
  lines.push(`=== REP: ${d.repName} ===`);
  lines.push(
    `Briefs: ${d.briefCount} · Rated: ${d.ratedCount} · Avg rating: ${ratingStr} · Trend: ${d.trend}`,
  );
  if (previousPriority) {
    lines.push(`Previous coaching priority: "${previousPriority}"`);
  }
  if (d.bantNotSurfaced.length) {
    lines.push("BANT dimensions left unprobed:");
    d.bantNotSurfaced.forEach((x) =>
      lines.push(`  • ${x.dimension} not surfaced in ${x.notSurfaced} of ${x.total} calls`),
    );
  }
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
      `Fields the rep corrected: ${d.correctedFields.map((f) => `${f.field} ×${f.count}`).join(", ")}`,
    );
  }
  if (d.lowRated.length) {
    lines.push(`Low-rated briefs (≤2/5): ${d.lowRated.length}`);
    d.lowRated
      .slice(0, 3)
      .forEach((b) => lines.push(`  • (${b.rating}/5) ${b.dealSummary} — note: ${b.improveNext}`));
  }
  if (d.feedbackNotes.length) {
    lines.push(`Feedback notes left:`);
    d.feedbackNotes.slice(0, 3).forEach((f) => lines.push(`  • ${f}`));
  }
  if (transcripts.length) {
    lines.push(`Recent call transcripts (truncated):`);
    transcripts.forEach((t, i) => lines.push(`  --- call ${i + 1} ---\n${t}`));
  }
  return lines.join("\n");
}

function buildUserMessage(
  digests: RepDigest[],
  briefs: SavedBrief[],
  previousPriorities: Record<string, string>,
): string {
  const byRep = new Map<string, string[]>();
  for (const b of briefs) {
    const k = repKey(b);
    if (!byRep.has(k)) byRep.set(k, []);
    if (b.transcript.trim()) byRep.get(k)!.push(truncate(b.transcript.trim(), 1200));
  }

  const blocks = digests.map((d) =>
    repBlock(d, (byRep.get(d.repName) ?? []).slice(-6), previousPriorities[d.repName]),
  );

  return [
    "Here is the team's brief data, grouped by rep.",
    "",
    blocks.join("\n\n"),
    "",
    "For each rep produce a coaching priority and improvedOnLastPriority; then the team's most common qualification gap, a one-sentence takeaway, and the team's recurring objection patterns. Call submit_digest.",
  ].join("\n");
}

const SUBMIT_DIGEST_TOOL: Anthropic.Tool = {
  name: "submit_digest",
  description:
    "Submit per-rep coaching priorities, the team read, and the team's recurring objection patterns.",
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
                "One specific, evidence-grounded coaching sentence citing the recurring pattern (with counts where possible).",
            },
            improvedOnLastPriority: {
              type: "string",
              enum: ["improving", "not_yet", "na"],
              description:
                "Whether recent calls show progress on the previous priority; 'na' if there was none.",
            },
          },
          required: ["repName", "priority", "improvedOnLastPriority"],
        },
      },
      teamCommonGap: {
        type: "string",
        description: "The single most common qualification gap across the whole team.",
      },
      teamTakeaway: {
        type: "string",
        description: "One sentence the manager should take away this week.",
      },
      objections: {
        type: "array",
        description:
          "The team's most common recurring objections, ordered by frequency. Only objections actually present in the data.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Short objection name." },
            summary: { type: "string", description: "One line on how it shows up." },
            suggestedResponse: {
              type: "string",
              description:
                "A response approach synthesized from the highest-rated briefs where it appeared.",
            },
          },
          required: ["label", "summary", "suggestedResponse"],
        },
      },
    },
    required: ["reps", "teamCommonGap", "teamTakeaway", "objections"],
  },
};

export type RepPriority = {
  repName: string;
  priority: string;
  improvedOnLastPriority: "improving" | "not_yet" | "na";
  /** The previous digest's priority for this rep (filled in by the API route). */
  lastPriority?: string | null;
};
export type ObjectionPattern = {
  label: string;
  summary: string;
  suggestedResponse: string;
};
export type DigestResult = {
  reps: RepPriority[];
  teamCommonGap: string;
  teamTakeaway: string;
  objections: ObjectionPattern[];
};

/** Call Sonnet to synthesize coaching priorities, week-over-week, and objections. */
export async function generateCoaching(
  briefs: SavedBrief[],
  previousPriorities: Record<string, string> = {},
): Promise<DigestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  const client = new Anthropic({ apiKey });
  const digests = buildRepDigests(briefs);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [SUBMIT_DIGEST_TOOL],
    tool_choice: { type: "tool", name: "submit_digest" },
    messages: [
      { role: "user", content: buildUserMessage(digests, briefs, previousPriorities) },
    ],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a submit_digest call.");
  return toolUse.input as DigestResult;
}
