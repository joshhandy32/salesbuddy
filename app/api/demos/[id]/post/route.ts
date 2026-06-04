import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postPlainTextToSlack } from "@/lib/slack";

// Post an already-logged demo's call-out line to Slack (plain text).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "Empty message." }, { status: 400 });
  }

  const row = await prisma.demoSet.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Demo not found." }, { status: 404 });
  }

  const result = await postPlainTextToSlack(text);
  if (result.ok) {
    await prisma.demoSet.update({ where: { id }, data: { postedToSlack: true } });
  }
  return NextResponse.json(result);
}
