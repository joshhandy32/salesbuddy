import { prisma } from "./prisma";
import type { Brief as BriefRow } from "@prisma/client";
import type { BriefResult, SavedBrief } from "./types";

// How many past briefs to surface to the model as memory.
const MEMORY_LIMIT = 5;
// How many recent rows to consider before prioritizing.
const SCAN_WINDOW = 25;

/** Parse a raw DB row (JSON text columns) into a typed SavedBrief. */
export function parseBrief(row: BriefRow): SavedBrief {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    repName: row.repName,
    email: row.email,
    transcript: row.transcript,
    notes: row.notes,
    result: JSON.parse(row.result) as BriefResult,
    rating: row.rating,
    feedbackNote: row.feedbackNote,
    corrected: row.corrected ? (JSON.parse(row.corrected) as BriefResult) : null,
  };
}

/** True if a brief carries a learning signal worth prioritizing in memory. */
function hasSignal(b: SavedBrief): boolean {
  return (
    b.corrected !== null ||
    (b.feedbackNote?.trim().length ?? 0) > 0 ||
    (b.rating !== null && b.rating <= 2)
  );
}

/**
 * Fetch the briefs to use as memory for the next generation.
 * Scoped to the rep when provided. Briefs carrying feedback/corrections/low
 * ratings are prioritized (that's the strongest learning signal), then recency.
 */
export async function getMemoryBriefs(repName?: string): Promise<SavedBrief[]> {
  const rows = await prisma.brief.findMany({
    where: repName?.trim() ? { repName: repName.trim() } : undefined,
    orderBy: { createdAt: "desc" },
    take: SCAN_WINDOW,
  });

  const briefs = rows.map(parseBrief);
  // Signal-bearing first, then most recent. Stable since findMany is sorted desc.
  return [...briefs]
    .sort((a, b) => Number(hasSignal(b)) - Number(hasSignal(a)))
    .slice(0, MEMORY_LIMIT);
}

/** List the top-level text fields the rep changed between AI and corrected versions. */
function changedFields(ai: BriefResult, corrected: BriefResult): string[] {
  const lines: string[] = [];
  const a = ai.aeBrief;
  const c = corrected.aeBrief;

  if (a.dealSummary !== c.dealSummary)
    lines.push(`Deal summary: "${c.dealSummary}"`);
  if (a.whyNow !== c.whyNow) lines.push(`Why now: "${c.whyNow}"`);
  if (a.suggestedOpener !== c.suggestedOpener)
    lines.push(`Suggested opener: "${c.suggestedOpener}"`);
  if (JSON.stringify(a.risks) !== JSON.stringify(c.risks))
    lines.push(`Risks: ${c.risks.map((r) => `"${r}"`).join("; ")}`);

  const ac = ai.bdrCoaching;
  const cc = corrected.bdrCoaching;
  if (ac.didWell !== cc.didWell) lines.push(`Coaching → did well: "${cc.didWell}"`);
  if (ac.improveNext !== cc.improveNext)
    lines.push(`Coaching → improve next: "${cc.improveNext}"`);
  if (ac.qualificationGap !== cc.qualificationGap)
    lines.push(`Coaching → qualification gap: "${cc.qualificationGap}"`);

  return lines;
}

/**
 * Build the MEMORY text injected into the user message, or null if there's
 * nothing useful to inject.
 */
export function buildMemoryBlock(
  briefs: SavedBrief[],
  repName?: string,
): string | null {
  if (briefs.length === 0) return null;

  const whose = repName?.trim() ? `${repName.trim()}'s` : "your";
  const out: string[] = [
    `=== MEMORY — ${whose} recent briefs (newest first) ===`,
    "Use this two ways: reference a past call only when it genuinely connects to the deal below, and apply the rep's ratings, feedback, and edits so you don't repeat past misses. If nothing here is relevant, ignore it.",
    "",
  ];

  briefs.forEach((b, i) => {
    const date = b.createdAt.slice(0, 10);
    const rating = b.rating !== null ? `rated ${b.rating}/5` : "unrated";
    out.push(`[${i + 1}] ${date} · ${b.result.aeBrief.dealSummary} · ${rating}`);

    if (b.feedbackNote?.trim()) {
      out.push(`    Rep feedback: "${b.feedbackNote.trim()}"`);
    }
    if (b.corrected) {
      const changes = changedFields(b.result, b.corrected);
      if (changes.length > 0) {
        out.push("    The rep edited the brief. They preferred:");
        changes.forEach((c) => out.push(`      • ${c}`));
      }
    }
    out.push("");
  });

  return out.join("\n").trimEnd();
}
