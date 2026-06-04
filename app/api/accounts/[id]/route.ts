import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};
const FIELDS = ["domain", "industry", "size", "website", "ownerName", "notes"] as const;

// Account detail with its contacts and deals.
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.account.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!row) return NextResponse.json({ error: "Account not found." }, { status: 404 });
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
  for (const f of FIELDS) if (f in b) data[f] = str(b[f]);
  try {
    const row = await prisma.account.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
}
