import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STEP_TYPES = ["EMAIL", "CALL", "FOLLOWUP", "TODO"];

export type CadenceStep = { day: number; type: string; title: string };

// Normalize/validate a steps array coming from the client.
export function cleanSteps(raw: unknown): CadenceStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        day: Math.max(0, Math.floor(Number(o.day) || 0)),
        type: STEP_TYPES.includes(String(o.type)) ? String(o.type) : "FOLLOWUP",
        title: String(o.title ?? "").trim(),
      };
    })
    .filter((s) => s.title)
    .sort((a, b) => a.day - b.day);
}

export async function GET() {
  const rows = await prisma.cadence.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Cadence name is required." }, { status: 400 });
  const steps = cleanSteps(b.steps);
  if (steps.length === 0) {
    return NextResponse.json({ error: "Add at least one step." }, { status: 400 });
  }
  const row = await prisma.cadence.create({ data: { name, steps: JSON.stringify(steps) } });
  return NextResponse.json(row);
}
