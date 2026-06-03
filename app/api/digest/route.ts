import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { generateCoaching } from "@/lib/digest";

// Synthesize coaching priorities, week-over-week, and objections (one Sonnet call).
export async function POST() {
  try {
    const rows = await prisma.brief.findMany({ orderBy: { createdAt: "asc" } });
    const briefs = rows.map(parseBrief);

    if (briefs.length === 0) {
      return NextResponse.json({
        reps: [],
        teamCommonGap: "",
        teamTakeaway: "No briefs yet — generate some briefs with rep names first.",
        objections: [],
      });
    }

    // Previous priorities for week-over-week comparison.
    const snaps = await prisma.coachingSnapshot.findMany();
    const previous: Record<string, string> = {};
    for (const s of snaps) previous[s.repName] = s.priority;

    const result = await generateCoaching(briefs, previous);

    // Save this round's priorities for next time.
    await Promise.all(
      result.reps.map((r) =>
        prisma.coachingSnapshot.upsert({
          where: { repName: r.repName },
          update: { priority: r.priority },
          create: { repName: r.repName, priority: r.priority },
        }),
      ),
    );

    // Attach the prior priority so the UI can show "Last week: …".
    const enriched = {
      ...result,
      reps: result.reps.map((r) => ({
        ...r,
        lastPriority: previous[r.repName] ?? null,
      })),
    };

    return NextResponse.json(enriched);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
