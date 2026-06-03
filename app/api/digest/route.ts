import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { buildRepDigests, generateCoaching } from "@/lib/digest";

// Synthesize coaching priorities across the team (one Sonnet call).
export async function POST() {
  try {
    const rows = await prisma.brief.findMany({ orderBy: { createdAt: "asc" } });
    const digests = buildRepDigests(rows.map(parseBrief));

    if (digests.length === 0) {
      return NextResponse.json({
        reps: [],
        teamCommonGap: "",
        teamTakeaway: "No briefs yet — generate some briefs with rep names first.",
      });
    }

    const result = await generateCoaching(digests);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
