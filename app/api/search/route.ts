import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { briefDisplayTitle } from "@/lib/briefTitle";

// Lightweight index for the command palette (⌘K). Returns only the fields the
// palette needs — not the heavy email/transcript columns — so it stays fast as
// history grows.
export async function GET() {
  const [briefs, demos] = await Promise.all([
    prisma.brief.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, company: true, repName: true, result: true, flagged: true },
    }),
    prisma.demoSet.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, prospect: true, setType: true, status: true, aeName: true },
    }),
  ]);

  const briefItems = briefs.map((b) => {
    let summary: string | undefined;
    try {
      summary = JSON.parse(b.result)?.aeBrief?.dealSummary;
    } catch {
      summary = undefined;
    }
    const display = b.company?.trim()
      ? { title: b.company.trim(), failed: false }
      : briefDisplayTitle(summary, b.flagged);
    return {
      id: b.id,
      title: display.title,
      subtitle: b.repName?.trim() || "",
      // Extra text folded into the match haystack (not shown).
      haystack: [b.company, b.repName, summary].filter(Boolean).join(" "),
    };
  });

  const demoItems = demos.map((d) => ({
    id: d.id,
    title: d.prospect,
    subtitle: [d.setType, d.status].filter(Boolean).join(" · "),
    haystack: [d.prospect, d.setType, d.status, d.aeName].filter(Boolean).join(" "),
  }));

  return NextResponse.json({ briefs: briefItems, demos: demoItems });
}
