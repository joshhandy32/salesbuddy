import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDealStage } from "@/lib/crm";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};
const num = (v: unknown) => Math.max(0, Number(v) || 0);

// List deals with account + contact names.
export async function GET() {
  const rows = await prisma.deal.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(rows);
}

// Create a deal.
export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Deal name is required." }, { status: 400 });

  const row = await prisma.deal.create({
    data: {
      name,
      accountId: str(b.accountId),
      contactId: str(b.contactId),
      stage: isDealStage(b.stage) ? b.stage : "NEW",
      amount: num(b.amount),
      closeDate: b.closeDate ? new Date(String(b.closeDate)) : null,
      ownerName: str(b.ownerName),
      notes: str(b.notes),
    },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(row);
}
