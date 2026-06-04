import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLeadStatus, isPriority } from "@/lib/crm";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

// List contacts (optionally filtered by ?status=), with account name.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const rows = await prisma.contact.findMany({
    where: isLeadStatus(status) ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { account: { select: { id: true, name: true } } },
  });
  return NextResponse.json(rows);
}

// Create a contact / lead.
export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });

  const row = await prisma.contact.create({
    data: {
      name,
      email: str(b.email),
      phone: str(b.phone),
      title: str(b.title),
      accountId: str(b.accountId),
      status: isLeadStatus(b.status) ? b.status : "NEW",
      source: str(b.source),
      priority: isPriority(b.priority) ? b.priority : "MEDIUM",
      ownerName: str(b.ownerName),
      notes: str(b.notes),
    },
    include: { account: { select: { id: true, name: true } } },
  });
  return NextResponse.json(row);
}
