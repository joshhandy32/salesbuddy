import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { sendBriefToSlack } from "@/lib/slack";

// Send a saved brief's two messages to Slack. Decoupled from generation so a
// Slack failure can never block the brief from saving or displaying.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await prisma.brief.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Brief not found." }, { status: 404 });
  }
  const result = await sendBriefToSlack(parseBrief(row));
  return NextResponse.json(result);
}
