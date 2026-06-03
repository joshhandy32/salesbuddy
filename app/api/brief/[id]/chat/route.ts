import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { answerFollowUp, type ChatMessage } from "@/lib/chat";

// Follow-up Q&A scoped to one saved brief.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && m.content?.trim(),
  );
  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const row = await prisma.brief.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }

  try {
    const reply = await answerFollowUp(parseBrief(row), messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
