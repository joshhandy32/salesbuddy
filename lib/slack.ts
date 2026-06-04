import { prisma } from "./prisma";
import type { BriefResult, SavedBrief } from "./types";

export type SlackResult = { ok: boolean; ts?: string; error?: string };

type Block = Record<string, unknown>;

// Escape the characters Slack mrkdwn treats specially.
const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const header = (text: string): Block => ({
  type: "header",
  text: { type: "plain_text", text: clamp(text, 150), emoji: true },
});
const section = (mrkdwn: string): Block => ({
  type: "section",
  text: { type: "mrkdwn", text: clamp(mrkdwn, 2900) },
});
const divider: Block = { type: "divider" };

function dispositionLabel(d: "champion" | "blocker" | "neutral"): string {
  if (d === "champion") return ":large_green_circle: champion";
  if (d === "blocker") return ":red_circle: blocker";
  return "neutral";
}

// ── Message 1: AE Brief ───────────────────────────────────────────────────
export function buildAEBlocks(brief: SavedBrief): Block[] {
  const r: BriefResult = brief.corrected ?? brief.result;
  const ae = r.aeBrief;
  const company = brief.company?.trim() || "Unknown company";
  const rep = brief.repName?.trim() || "Unknown rep";

  const bant = (["budget", "authority", "need", "timeline"] as const)
    .map((k) => {
      const dim = ae.bant[k];
      const label = k.charAt(0).toUpperCase() + k.slice(1);
      return `• *${label}:* ${dim.surfaced ? `"${esc(dim.evidence)}"` : "_not surfaced_"}`;
    })
    .join("\n");

  const room = ae.room.length
    ? ae.room
        .map((p) => `• *${esc(p.name)}* — ${esc(p.role)}  ${dispositionLabel(p.disposition)}`)
        .join("\n")
    : "_No attendees identified._";

  const risks = ae.risks.length
    ? ae.risks.slice(0, 2).map((r, i) => `${i + 1}. ${esc(r)}`).join("\n")
    : "_None flagged._";

  return [
    header(`New Brief — ${company} — from ${rep}`),
    section(`*Deal summary*\n${esc(ae.dealSummary)}`),
    section(`*BANT*\n${bant}`),
    section(`*Why now*\n${esc(ae.whyNow)}`),
    section(`*Who's in the room*\n${room}`),
    section(`*Suggested opener*\n> ${esc(ae.suggestedOpener)}`),
    section(`*Top risks*\n${risks}`),
  ];
}

// ── Message 2: BDR Coaching Note ──────────────────────────────────────────
export function buildCoachingBlocks(brief: SavedBrief): Block[] {
  const r: BriefResult = brief.corrected ?? brief.result;
  const c = r.bdrCoaching;
  const company = brief.company?.trim() || "Unknown company";
  const rep = brief.repName?.trim() || "Unknown rep";

  return [
    header(`Coaching Note — ${rep} — ${company}`),
    section(`*What went well*\n${esc(c.didWell)}`),
    section(`*Improve next time*\n${esc(c.improveNext)}`),
    section(`*Qualification gap*\n${esc(c.qualificationGap)}`),
    divider,
  ];
}

// ── Channel config: DB row, seeded from env on first run ──────────────────
export async function getSlackChannel(): Promise<string | null> {
  const existing = await prisma.slackSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing.channelId;
  const seed = process.env.SLACK_CHANNEL_ID?.trim();
  if (!seed) return null;
  const created = await prisma.slackSettings.create({
    data: { id: "default", channelId: seed },
  });
  return created.channelId;
}

// ── Channel name resolution (cached) ──────────────────────────────────────
async function fetchChannelName(token: string, channel: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channel)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
    );
    const data = (await res.json()) as { ok: boolean; channel?: { name?: string } };
    return data.ok && data.channel?.name ? data.channel.name : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the configured channel to a human-readable "#name" for display.
 * Uses the cached name when present; otherwise calls the Slack API once and
 * caches the result. Falls back to the raw channel ID if resolution fails.
 */
export async function getSlackChannelDisplay(): Promise<{
  channelId: string | null;
  display: string | null;
}> {
  const row = await prisma.slackSettings.findUnique({ where: { id: "default" } });
  const channelId = row?.channelId ?? process.env.SLACK_CHANNEL_ID?.trim() ?? null;
  if (!channelId) return { channelId: null, display: null };

  if (row?.channelName) return { channelId, display: `#${row.channelName}` };

  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (token) {
    const name = await fetchChannelName(token, channelId);
    if (name) {
      await prisma.slackSettings.upsert({
        where: { id: "default" },
        update: { channelId, channelName: name },
        create: { id: "default", channelId, channelName: name },
      });
      return { channelId, display: `#${name}` };
    }
  }
  return { channelId, display: channelId };
}

async function postMessage(
  token: string,
  channel: string,
  text: string,
  blocks?: Block[],
): Promise<SlackResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      // Omit blocks for a plain-text message (looks like a person typed it).
      body: JSON.stringify(blocks ? { channel, text, blocks } : { channel, text }),
      signal: controller.signal,
    });
    const data = (await res.json()) as { ok: boolean; ts?: string; error?: string };
    return data.ok ? { ok: true, ts: data.ts } : { ok: false, error: data.error || "slack_error" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/** Post a single plain-text line to the configured channel (no Block Kit). */
export async function postPlainTextToSlack(text: string): Promise<SlackResult> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN is not set." };
  const channel = await getSlackChannel();
  if (!channel) return { ok: false, error: "No Slack channel configured." };
  return postMessage(token, channel, text);
}

/**
 * Send the two messages (AE brief, then coaching note) to the configured channel.
 * Never throws — returns {ok:false,error} so a Slack problem can't break the brief.
 */
export async function sendBriefToSlack(brief: SavedBrief): Promise<SlackResult> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "SLACK_BOT_TOKEN is not set." };
  const channel = await getSlackChannel();
  if (!channel) return { ok: false, error: "No Slack channel configured." };

  const company = brief.company?.trim() || "deal";
  const rep = brief.repName?.trim() || "rep";

  const r1 = await postMessage(
    token,
    channel,
    `New Brief — ${company}`,
    buildAEBlocks(brief),
  );
  if (!r1.ok) return r1;

  const r2 = await postMessage(
    token,
    channel,
    `Coaching Note — ${rep}`,
    buildCoachingBlocks(brief),
  );
  if (!r2.ok) return r2;

  return { ok: true, ts: r1.ts };
}
