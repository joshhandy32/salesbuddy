import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Remove a past month from the historicals table.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.pacingMonth.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }
}
