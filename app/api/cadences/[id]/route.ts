import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanSteps } from "../route";

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
  if ("steps" in b) {
    const steps = cleanSteps(b.steps);
    if (steps.length === 0) return NextResponse.json({ error: "Add at least one step." }, { status: 400 });
    data.steps = JSON.stringify(steps);
  }
  try {
    const row = await prisma.cadence.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Cadence not found." }, { status: 404 });
  }
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.cadence.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Cadence not found." }, { status: 404 });
  }
}
