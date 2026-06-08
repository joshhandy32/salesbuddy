import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { OrumRow, OrumReport } from "@/lib/orum";

// Vision-capable Sonnet — reads an Orum analytics PNG/screenshot and extracts
// the table. This is the convenience path; CSV is the reliable one.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You extract the data table from a screenshot of an Orum dialer analytics dashboard. The table has one row per rep plus a "Total" row. Read every row and column exactly as shown.

Columns (left to right): Rep name, Dials, Dial to connect, Bridged to connect, Outbound connects, Connect to conversation, Conversations, Conversation to meeting, Meetings, Callbacks, Callback to connect, Callback connects, Dial time, Talk time, Pause Time, Session Time.

Normalization rules — follow exactly:
- Rate columns (Dial to connect, Bridged to connect, Connect to conversation, Conversation to meeting, Callback to connect) are shown as percentages like "5.46%". Return them as DECIMAL FRACTIONS (5.46% -> 0.0546).
- Count columns (Dials, Outbound connects, Conversations, Meetings, Callbacks, Callback connects) are integers. Strip any thousands commas (1,063 -> 1063).
- Time columns (Dial time, Talk time, Pause Time, Session Time) are shown like "2h 57m 40s". Return them as TOTAL SECONDS (2h 57m 40s -> 10660).
- Include the Total row. Use the exact rep name text shown.
- If a cell is unreadable, return 0 for it rather than guessing.

Return ONLY by calling submit_orum_metrics.`;

const ROW_PROPS = {
  repName: { type: "string" },
  dials: { type: "number" },
  dialToConnect: { type: "number", description: "decimal fraction" },
  bridgedToConnect: { type: "number", description: "decimal fraction" },
  outboundConnects: { type: "number" },
  connectToConversation: { type: "number", description: "decimal fraction" },
  conversations: { type: "number" },
  conversationToMeeting: { type: "number", description: "decimal fraction" },
  meetings: { type: "number" },
  callbacks: { type: "number" },
  callbackToConnect: { type: "number", description: "decimal fraction" },
  callbackConnects: { type: "number" },
  dialTime: { type: "number", description: "seconds" },
  talkTime: { type: "number", description: "seconds" },
  pauseTime: { type: "number", description: "seconds" },
  sessionTime: { type: "number", description: "seconds" },
} as const;

const TOOL: Anthropic.Tool = {
  name: "submit_orum_metrics",
  description: "Submit the extracted Orum analytics rows.",
  input_schema: {
    type: "object",
    properties: {
      rows: {
        type: "array",
        description: "Every row in the table, including the Total row.",
        items: { type: "object", properties: ROW_PROPS, required: ["repName", "dials", "meetings"] },
      },
    },
    required: ["rows"],
  },
};

const num = (v: unknown) => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

function toRow(o: Record<string, unknown>): OrumRow {
  const repName = String(o.repName ?? "").trim();
  return {
    repName,
    dials: num(o.dials),
    dialToConnect: num(o.dialToConnect),
    bridgedToConnect: num(o.bridgedToConnect),
    outboundConnects: num(o.outboundConnects),
    connectToConversation: num(o.connectToConversation),
    conversations: num(o.conversations),
    conversationToMeeting: num(o.conversationToMeeting),
    meetings: num(o.meetings),
    callbacks: num(o.callbacks),
    callbackToConnect: num(o.callbackToConnect),
    callbackConnects: num(o.callbackConnects),
    dialTime: num(o.dialTime),
    talkTime: num(o.talkTime),
    pauseTime: num(o.pauseTime),
    sessionTime: num(o.sessionTime),
    isTotal: repName.toLowerCase() === "total",
  };
}

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
  }

  let body: { image?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Accept a raw base64 string or a data URL.
  let base64 = body.image ?? "";
  let mediaType = body.mediaType ?? "image/png";
  const dataUrl = base64.match(/^data:(image\/[a-zA-Z+]+);base64,([\s\S]*)$/);
  if (dataUrl) {
    mediaType = dataUrl[1];
    base64 = dataUrl[2];
  }
  if (!base64) return NextResponse.json({ error: "No image provided." }, { status: 400 });
  if (!ALLOWED_MEDIA.includes(mediaType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  // ~7MB base64 ceiling to stay within model image limits.
  if (base64.length > 7_500_000) {
    return NextResponse.json(
      { error: "Image is too large — try a tighter screenshot or use the CSV export." },
      { status: 400 },
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_orum_metrics" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/png", data: base64 },
            },
            { type: "text", text: "Extract the full Orum analytics table." },
          ],
        },
      ],
    });

    const toolUse = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json({ error: "Couldn't read the table from that image." }, { status: 422 });
    }

    const raw = (toolUse.input as { rows?: Record<string, unknown>[] }).rows ?? [];
    const all = raw.map(toRow).filter((r) => r.repName || r.dials || r.meetings);
    const report: OrumReport = {
      rows: all.filter((r) => !r.isTotal),
      total: all.find((r) => r.isTotal) ?? null,
    };
    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
