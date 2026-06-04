// ICP Analyzer (Module 6) — "what converts".
//
// Two layers, mirroring the Coaching Digest:
//   1. Deterministic aggregation (no AI) of the real demo funnel — by channel,
//      AE, day-of-week and time-of-day — plus qualitative context pulled from
//      briefs (industries worked, deal sizes, prospect needs).
//   2. AI synthesis (Sonnet, forced tool call) that reads those aggregates and
//      writes the rep's Ideal Customer Profile: the standout segments, concrete
//      recommendations, and the leaks to watch.
//
// Conversion math is grounded ENTIRELY in DemoSet outcomes — the AI never
// invents a number. Briefs are passed only as soft context.

import Anthropic from "@anthropic-ai/sdk";

// Sonnet — strong reasoning, low per-call cost (matches brief/digest).
const MODEL = "claude-sonnet-4-6";

// ── Time windows ─────────────────────────────────────────────────────────────
export type IcpWindow = "30d" | "90d" | "all";
export const ICP_WINDOWS: { key: IcpWindow; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];
export function normalizeWindow(w: unknown): IcpWindow {
  return w === "30d" || w === "90d" || w === "all" ? w : "all";
}
/** Cutoff Date for a window, or null for "all time". Filter demos/briefs by createdAt >= cutoff. */
export function windowCutoff(w: IcpWindow, now: Date = new Date()): Date | null {
  if (w === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (w === "90d") return new Date(now.getTime() - 90 * 86400000);
  return null;
}

// ── Inputs (decoupled from Prisma row types) ─────────────────────────────────
/** The DemoSet fields the analyzer needs. Dates are real Date objects. */
export type DemoRecord = {
  setType: string; // CC | LinkedIn | Email | RSC | FL
  prospect: string;
  need: string;
  status: string; // SET|SHOWED|NO_SHOW|RESCHEDULED|COMPLETED|CLOSED_WON|CLOSED_LOST|RELIEF
  demoDate: Date;
  aeName: string | null;
  dealRevenue: number | null;
};

/** The Brief fields used for soft, qualitative context. */
export type BriefContext = {
  company: string | null;
  industry: string | null;
  dealSize: string | null;
};

// ── Funnel classification ────────────────────────────────────────────────────
// A demo "showed" if it got past the booked state into the meeting (or beyond).
const SHOWED = new Set(["SHOWED", "COMPLETED", "CLOSED_WON", "CLOSED_LOST"]);
const COMPLETED = new Set(["COMPLETED", "CLOSED_WON", "CLOSED_LOST"]);

const isShowed = (s: string) => SHOWED.has(s);
const isCompleted = (s: string) => COMPLETED.has(s);
const isWon = (s: string) => s === "CLOSED_WON";
const isLost = (s: string) => s === "CLOSED_LOST";
const isNoShow = (s: string) => s === "NO_SHOW";

const pct = (a: number, b: number) => (b > 0 ? a / b : 0);

// ── Channel display names ────────────────────────────────────────────────────
export const CHANNEL_LABELS: Record<string, string> = {
  CC: "Cold Call",
  LinkedIn: "LinkedIn",
  Email: "Email",
  RSC: "Referral / SC",
  FL: "Field / Live",
};
export const channelLabel = (t: string) => CHANNEL_LABELS[t] ?? t;

// ── Segment shape ────────────────────────────────────────────────────────────
export type Segment = {
  /** Stable key (channel code, AE name, day name, time bucket). */
  key: string;
  /** Human label. */
  label: string;
  set: number;
  showed: number;
  completed: number;
  won: number;
  lost: number;
  noShow: number;
  revenue: number;
  /** showed / set */
  showRate: number;
  /** completed / set */
  completeRate: number;
  /** won / completed — null when no completed demos to judge. */
  winRate: number | null;
  /** revenue / set — value generated per demo booked through this segment. */
  revenuePerDemo: number;
};

function buildSegment(key: string, label: string, demos: DemoRecord[]): Segment {
  const set = demos.length;
  const showed = demos.filter((d) => isShowed(d.status)).length;
  const completed = demos.filter((d) => isCompleted(d.status)).length;
  const won = demos.filter((d) => isWon(d.status)).length;
  const lost = demos.filter((d) => isLost(d.status)).length;
  const noShow = demos.filter((d) => isNoShow(d.status)).length;
  const revenue = demos
    .filter((d) => isWon(d.status))
    .reduce((s, d) => s + (d.dealRevenue ?? 0), 0);
  return {
    key,
    label,
    set,
    showed,
    completed,
    won,
    lost,
    noShow,
    revenue,
    showRate: pct(showed, set),
    completeRate: pct(completed, set),
    winRate: completed > 0 ? pct(won, completed) : null,
    revenuePerDemo: pct(revenue, set),
  };
}

// ── Time bucketing ───────────────────────────────────────────────────────────
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function timeBucket(d: Date): { key: string; label: string } {
  const h = d.getHours();
  if (h < 12) return { key: "morning", label: "Morning (before 12pm)" };
  if (h < 15) return { key: "early-pm", label: "Early afternoon (12–3pm)" };
  if (h < 18) return { key: "late-pm", label: "Late afternoon (3–6pm)" };
  return { key: "evening", label: "Evening (after 6pm)" };
}

// Group a list of demos by a key function into Segments, dropping empties and
// sorting by completion rate (then volume) so the strongest segment leads.
function groupBy(
  demos: DemoRecord[],
  keyOf: (d: DemoRecord) => { key: string; label: string } | null,
): Segment[] {
  const groups = new Map<string, { label: string; demos: DemoRecord[] }>();
  for (const d of demos) {
    const k = keyOf(d);
    if (!k) continue;
    if (!groups.has(k.key)) groups.set(k.key, { label: k.label, demos: [] });
    groups.get(k.key)!.demos.push(d);
  }
  return [...groups.entries()]
    .map(([key, { label, demos }]) => buildSegment(key, label, demos))
    .sort((a, b) => b.completeRate - a.completeRate || b.set - a.set);
}

// ── Top-level analysis (deterministic) ───────────────────────────────────────
export type IcpAnalysis = {
  /** Overall funnel across every demo. */
  overall: Segment;
  byChannel: Segment[];
  byAE: Segment[];
  byDay: Segment[];
  byTime: Segment[];
  /** Industries seen across briefs, most frequent first. */
  industries: { name: string; count: number }[];
  /** Deal sizes seen across briefs, most frequent first. */
  dealSizes: { name: string; count: number }[];
  /** A sample of prospect needs (for persona color in the AI pass). */
  needsSample: string[];
  /** Total demos analyzed — drives the confidence read. */
  totalDemos: number;
};

function tally(values: (string | null | undefined)[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const t = v?.trim();
    if (!t) continue;
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function analyzeIcp(demos: DemoRecord[], briefs: BriefContext[]): IcpAnalysis {
  return {
    overall: buildSegment("overall", "All demos", demos),
    byChannel: groupBy(demos, (d) =>
      d.setType ? { key: d.setType, label: channelLabel(d.setType) } : null,
    ),
    byAE: groupBy(demos, (d) => {
      const ae = d.aeName?.trim();
      return ae ? { key: ae, label: ae } : null;
    }),
    byDay: groupBy(demos, (d) => {
      const n = d.demoDate.getDay();
      return { key: String(n), label: DAY_NAMES[n] };
    }).sort((a, b) => Number(a.key) - Number(b.key)),
    byTime: groupBy(demos, (d) => timeBucket(d.demoDate)),
    industries: tally(briefs.map((b) => b.industry)),
    dealSizes: tally(briefs.map((b) => b.dealSize)),
    needsSample: demos
      .map((d) => d.need?.trim())
      .filter((n): n is string => !!n)
      .slice(0, 25),
    totalDemos: demos.length,
  };
}

// ── AI synthesis (Sonnet) ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a RevOps analyst building an Ideal Customer Profile from a sales rep's own demo funnel. You write like a sharp operator: specific, grounded in the numbers you are given, and free of filler. No em-dashes. Never invent a statistic — every number you cite must come from the data provided.

You are given the rep's full demo funnel broken down by channel (how the demo was sourced), by AE who ran it, by day of week, and by time of day. Each segment lists demos set, show rate, complete rate, win rate (of completed demos that closed-won), and revenue. You are also given soft context from their briefs: industries worked, deal sizes, and a sample of prospect needs.

Your job is to find the signal in what actually converts and turn it into an ICP the rep can act on. Specifically:

1. idealProfile — 2 to 3 sentences describing the rep's highest-converting profile: the channel, timing, and (where the brief context supports it) the kind of company and need that turns into closed-won. Lead with the strongest evidence. If the data is thin, say so plainly instead of overreaching.

2. topSegments — the 2 to 4 standout segments. For each: dimension ("Channel", "AE", "Day", or "Time"), the segment label, the headline metric that makes it stand out (e.g. "62% complete rate on 13 demos" or "$48k revenue per demo"), and one sentence on why it matters. Only call out a segment as a winner when it has enough volume to trust; never crown a 1-demo segment.

3. recommendations — 2 to 4 concrete, do-this-Monday actions that shift effort toward what converts (e.g. "Move more dials into Tuesday mornings, which complete at 2x your Friday rate"). Each tied to a number from the data.

4. watchOuts — 1 to 3 leaks or weak segments worth fixing (e.g. high no-show channels, days that never close). Tie each to a number. If there are none worth flagging, return an empty array.

5. confidence — "high", "medium", or "low" based on total demo volume and how lopsided the segment sizes are. Be honest: under ~15 demos is "low".

Order topSegments, recommendations, and watchOuts by impact. Return ONLY by calling the submit_icp tool. No prose outside the tool call.`;

const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function segmentLines(title: string, segs: Segment[]): string {
  if (!segs.length) return `${title}: (no data)`;
  const rows = segs.map((s) => {
    const win = s.winRate == null ? "n/a" : fmtPct(s.winRate);
    return `  • ${s.label}: ${s.set} set, ${fmtPct(s.showRate)} show, ${fmtPct(
      s.completeRate,
    )} complete, ${win} win (of completed), ${s.won} won, ${fmtMoney(s.revenue)} rev, ${fmtMoney(
      s.revenuePerDemo,
    )}/demo`;
  });
  return `${title}:\n${rows.join("\n")}`;
}

function buildUserMessage(a: IcpAnalysis): string {
  const parts: string[] = [];
  const o = a.overall;
  parts.push(
    `OVERALL FUNNEL: ${o.set} demos set, ${o.showed} showed (${fmtPct(
      o.showRate,
    )}), ${o.completed} completed (${fmtPct(o.completeRate)}), ${o.won} closed-won, ${
      o.lost
    } closed-lost, ${o.noShow} no-shows, ${fmtMoney(o.revenue)} total revenue.`,
    "",
    segmentLines("BY CHANNEL", a.byChannel),
    "",
    segmentLines("BY AE", a.byAE),
    "",
    segmentLines("BY DAY OF WEEK", a.byDay),
    "",
    segmentLines("BY TIME OF DAY", a.byTime),
    "",
  );
  if (a.industries.length) {
    parts.push(
      `INDUSTRIES (from briefs): ${a.industries
        .map((i) => `${i.name} ×${i.count}`)
        .join(", ")}`,
    );
  }
  if (a.dealSizes.length) {
    parts.push(
      `DEAL SIZES (from briefs): ${a.dealSizes.map((d) => `${d.name} ×${d.count}`).join(", ")}`,
    );
  }
  if (a.needsSample.length) {
    parts.push("PROSPECT NEEDS (sample):");
    a.needsSample.forEach((n) => parts.push(`  • ${n}`));
  }
  parts.push(
    "",
    "Build the ICP from what actually converts. Call submit_icp.",
  );
  return parts.join("\n");
}

const SUBMIT_ICP_TOOL: Anthropic.Tool = {
  name: "submit_icp",
  description:
    "Submit the Ideal Customer Profile synthesized from the rep's demo funnel.",
  input_schema: {
    type: "object",
    properties: {
      idealProfile: {
        type: "string",
        description:
          "2-3 sentences describing the highest-converting profile, led by the strongest evidence.",
      },
      topSegments: {
        type: "array",
        description: "The 2-4 standout segments, ordered by impact.",
        items: {
          type: "object",
          properties: {
            dimension: {
              type: "string",
              enum: ["Channel", "AE", "Day", "Time"],
            },
            label: { type: "string", description: "The segment label." },
            metric: {
              type: "string",
              description: "The headline stat that makes it stand out, with its number.",
            },
            insight: { type: "string", description: "One sentence on why it matters." },
          },
          required: ["dimension", "label", "metric", "insight"],
        },
      },
      recommendations: {
        type: "array",
        description: "2-4 concrete actions, each tied to a number from the data.",
        items: { type: "string" },
      },
      watchOuts: {
        type: "array",
        description: "0-3 leaks or weak segments worth fixing, each tied to a number.",
        items: { type: "string" },
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence based on demo volume and segment balance.",
      },
    },
    required: ["idealProfile", "topSegments", "recommendations", "watchOuts", "confidence"],
  },
};

export type IcpSegmentCallout = {
  dimension: "Channel" | "AE" | "Day" | "Time";
  label: string;
  metric: string;
  insight: string;
};
export type IcpSynthesis = {
  idealProfile: string;
  topSegments: IcpSegmentCallout[];
  recommendations: string[];
  watchOuts: string[];
  confidence: "high" | "medium" | "low";
};

/** Call Sonnet to synthesize the ICP from the deterministic analysis. */
export async function generateIcp(analysis: IcpAnalysis): Promise<IcpSynthesis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1536,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [SUBMIT_ICP_TOOL],
    tool_choice: { type: "tool", name: "submit_icp" },
    messages: [{ role: "user", content: buildUserMessage(analysis) }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Model did not return a submit_icp call.");
  return toolUse.input as IcpSynthesis;
}
