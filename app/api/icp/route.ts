import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeIcp, generateIcp, normalizeWindow, windowCutoff } from "@/lib/icp";

// Synthesize the Ideal Customer Profile from the demo funnel (one Sonnet call).
export async function POST(request: Request) {
  try {
    let window: unknown;
    try {
      window = (await request.json())?.window;
    } catch {
      window = "all";
    }
    const cutoff = windowCutoff(normalizeWindow(window));
    const createdFilter = cutoff ? { createdAt: { gte: cutoff } } : {};

    const [demos, briefs] = await Promise.all([
      prisma.demoSet.findMany({
        where: createdFilter,
        select: {
          setType: true,
          prospect: true,
          need: true,
          status: true,
          demoDate: true,
          aeName: true,
          dealRevenue: true,
        },
      }),
      prisma.brief.findMany({
        where: createdFilter,
        select: { company: true, industry: true, dealSize: true },
      }),
    ]);

    if (demos.length === 0) {
      return NextResponse.json(
        { error: "No demos logged yet — log some demo sets first to build your ICP." },
        { status: 400 },
      );
    }

    const analysis = analyzeIcp(demos, briefs);
    const result = await generateIcp(analysis);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
