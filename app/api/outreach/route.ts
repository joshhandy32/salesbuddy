import { NextResponse } from "next/server";
import { generateOutreach } from "@/lib/outreach";

// Draft a personalized outreach email (one Sonnet call). Drafting only.
export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contactName = String(b.contactName ?? "").trim();
  if (!contactName) {
    return NextResponse.json({ error: "A contact name is required." }, { status: 400 });
  }
  const kind = b.kind === "followup" || b.kind === "breakup" ? b.kind : "cold";

  try {
    const draft = await generateOutreach({
      contactName,
      title: typeof b.title === "string" ? b.title : null,
      company: typeof b.company === "string" ? b.company : null,
      industry: typeof b.industry === "string" ? b.industry : null,
      goal: String(b.goal ?? ""),
      tone: typeof b.tone === "string" ? b.tone : undefined,
      kind,
    });
    return NextResponse.json(draft);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
