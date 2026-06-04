import { NextResponse } from "next/server";
import { postPlainTextToSlack } from "@/lib/slack";

// Post arbitrary plain text to the configured Slack channel (e.g. a recap).
export async function POST(request: Request) {
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
  const result = await postPlainTextToSlack(text);
  return NextResponse.json(result);
}
