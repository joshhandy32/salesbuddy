import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";
import type { BriefInput } from "@/lib/types";

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

  // Need at least one source to work from.
  if (!email.trim() && !transcript.trim() && !notes.trim()) {
    return NextResponse.json(
      { error: "Paste at least one of: email, transcript, or BDR notes." },
      { status: 400 },
    );
  }

  try {
    const brief = await generateBrief({ email, transcript, notes });
    return NextResponse.json(brief);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Unknown error.";
    // Missing key is a config problem (500); surface its message to help setup.
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
