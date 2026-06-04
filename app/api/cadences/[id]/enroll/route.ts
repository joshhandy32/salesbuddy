import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CadenceStep } from "../../route";

// Enroll a contact in a cadence: each step becomes a Task due `day` days out,
// linked to the contact and tagged with the cadence name as its source.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: { contactId?: string };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const contactId = (b.contactId || "").trim();
  if (!contactId) return NextResponse.json({ error: "A contact is required." }, { status: 400 });

  const [cadence, contact] = await Promise.all([
    prisma.cadence.findUnique({ where: { id } }),
    prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } }),
  ]);
  if (!cadence) return NextResponse.json({ error: "Cadence not found." }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  let steps: CadenceStep[] = [];
  try {
    steps = JSON.parse(cadence.steps);
  } catch {
    steps = [];
  }
  if (steps.length === 0) {
    return NextResponse.json({ error: "This cadence has no steps." }, { status: 400 });
  }

  // Anchor due dates to today's UTC-midnight calendar date (how date-only values
  // are stored elsewhere), then add each step's day offset.
  const now = new Date();
  const base = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.task.createMany({
    data: steps.map((s) => ({
      title: s.title,
      type: s.type,
      dueDate: new Date(base + s.day * 86400000),
      contactId,
      source: cadence.name,
    })),
  });

  return NextResponse.json({ enrolled: steps.length });
}
