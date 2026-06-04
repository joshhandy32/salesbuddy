import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";
import { prisma } from "@/lib/prisma";
import { getMemoryBriefs, buildMemoryBlock, parseBrief } from "@/lib/memory";
import type { BriefInput } from "@/lib/types";
import { isBadDealSummary } from "@/lib/briefTitle";

export async function POST(request: Request) {
  let body: Partial<BriefInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email ?? "";
  const transcript = body.transcript ?? "";
  const notes = body.notes ?? "";
  const repName = body.repName?.trim() || undefined;
  const company = body.company?.trim() || undefined;
  const dealSize = body.dealSize?.trim() || undefined;
  const industry = body.industry?.trim() || undefined;
  const aeName = body.aeName?.trim() || undefined;

  // Need at least one source to work from.
  if (!email.trim() && !transcript.trim() && !notes.trim()) {
    return NextResponse.json(
      { error: "Paste at least one of: email, transcript, or BDR notes." },
      { status: 400 },
    );
  }

  try {
    // 1. Pull this rep's memory and fold it into the prompt.
    const memoryBriefs = await getMemoryBriefs(repName);
    const memoryBlock = buildMemoryBlock(memoryBriefs, repName);

    // 2. Generate the brief.
    const result = await generateBrief(
      { email, transcript, notes, repName, company, dealSize, industry, aeName },
      memoryBlock,
    );

    // Flag failed extractions so the UI shows "Untitled brief" instead of an
    // AI error string as the title.
    const flagged =
      typeof result?.aeBrief !== "object" ||
      isBadDealSummary(result?.aeBrief?.dealSummary);

    // 3. Auto-save it, then return the saved row (with id) for rating/editing.
    const row = await prisma.brief.create({
      data: {
        repName,
        company,
        dealSize,
        industry,
        aeName,
        email,
        transcript,
        notes,
        result: JSON.stringify(result),
        flagged,
      },
    });

    return NextResponse.json(parseBrief(row));
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Unknown error.";
    // Missing key is a config problem (500); surface its message to help setup.
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}

// List saved briefs (newest first) for the history page.
export async function GET() {
  const rows = await prisma.brief.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows.map(parseBrief));
}
