import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// List accounts with contact/deal counts.
export async function GET() {
  const rows = await prisma.account.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });
  return NextResponse.json(rows);
}

// Create an account.
export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Account name is required." }, { status: 400 });

  const row = await prisma.account.create({
    data: {
      name,
      domain: str(b.domain),
      industry: str(b.industry),
      size: str(b.size),
      website: str(b.website),
      ownerName: str(b.ownerName),
      notes: str(b.notes),
    },
  });
  return NextResponse.json(row);
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}
