import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLeadStatus, isPriority } from "@/lib/crm";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

// Contact detail with account, deals, and activity timeline.
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.contact.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      deals: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  for (const f of ["email", "phone", "title", "accountId", "source", "ownerName", "notes"] as const) {
    if (f in b) data[f] = str(b[f]);
  }
  if (isLeadStatus(b.status)) data.status = b.status;
  if (isPriority(b.priority)) data.priority = b.priority;
  if (b.touch === true) data.lastTouchedAt = new Date();

  try {
    const row = await prisma.contact.update({
      where: { id },
      data,
      include: { account: { select: { id: true, name: true } } },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
}
