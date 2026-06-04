import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTIVITY_TYPES = ["OUTREACH", "EMAIL", "CALL", "NOTE", "STAGE"];

// Log an activity against a contact (and stamp lastTouchedAt for real touches).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: { type?: string; subject?: string; body?: string };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const type = ACTIVITY_TYPES.includes(b.type ?? "") ? (b.type as string) : "NOTE";
  const subject = b.subject?.trim() || null;
  const body = b.body?.trim() || null;
  if (!subject && !body) {
    return NextResponse.json({ error: "Activity needs a subject or body." }, { status: 400 });
  }

  try {
    const activity = await prisma.activity.create({
      data: { contactId: id, type, subject, body },
    });
    // Outreach / email / call count as a touch.
    if (["OUTREACH", "EMAIL", "CALL"].includes(type)) {
      await prisma.contact.update({ where: { id }, data: { lastTouchedAt: new Date() } });
    }
    return NextResponse.json(activity);
  } catch {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
}
