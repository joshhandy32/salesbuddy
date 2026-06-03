import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import type { BriefResult } from "@/lib/types";

type PatchBody = {
  rating?: number | null;
  feedbackNote?: string | null;
  corrected?: BriefResult | null;
};

// Fetch a single saved brief.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await prisma.brief.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
  return NextResponse.json(parseBrief(row));
}

// Update feedback: star rating, freeform note, and/or the rep's corrected brief.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.rating != null && (body.rating < 1 || body.rating > 5)) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    );
  }

  // Only touch fields that were actually provided.
  const data: {
    rating?: number | null;
    feedbackNote?: string | null;
    corrected?: string | null;
  } = {};
  if ("rating" in body) data.rating = body.rating ?? null;
  if ("feedbackNote" in body) data.feedbackNote = body.feedbackNote ?? null;
  if ("corrected" in body)
    data.corrected = body.corrected ? JSON.stringify(body.corrected) : null;

  try {
    const row = await prisma.brief.update({ where: { id }, data });
    return NextResponse.json(parseBrief(row));
  } catch {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
}

// Delete a saved brief.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.brief.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
}
