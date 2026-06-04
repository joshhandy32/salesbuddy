import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDealStage } from "@/lib/crm";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

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
  if (isDealStage(b.stage)) data.stage = b.stage;
  if (b.amount !== undefined) data.amount = Math.max(0, Number(b.amount) || 0);
  if ("accountId" in b) data.accountId = str(b.accountId);
  if ("contactId" in b) data.contactId = str(b.contactId);
  if ("notes" in b) data.notes = str(b.notes);
  if ("ownerName" in b) data.ownerName = str(b.ownerName);
  if ("closeDate" in b) data.closeDate = b.closeDate ? new Date(String(b.closeDate)) : null;

  try {
    const row = await prisma.deal.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.deal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
}
