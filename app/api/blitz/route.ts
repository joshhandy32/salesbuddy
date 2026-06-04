import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const clampInt = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

// Save a completed call-blitz session and roll its dials/connects/conversations
// into the current month's Historical so the Pacing Calculator stays in sync.
export async function POST(request: Request) {
  let body: {
    durationSec?: number;
    dials?: number;
    connects?: number;
    conversations?: number;
    demosSet?: number;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dials = clampInt(body.dials);
  const connects = clampInt(body.connects);
  const conversations = clampInt(body.conversations);
  const demosSet = clampInt(body.demosSet);
  const durationSec = clampInt(body.durationSec);
  const notes = body.notes?.trim() || null;

  if (dials + connects + conversations + demosSet === 0) {
    return NextResponse.json(
      { error: "Nothing to save — log at least one dial." },
      { status: 400 },
    );
  }

  try {
    const session = await prisma.blitzSession.create({
      data: { durationSec, dials, connects, conversations, demosSet, notes },
    });

    // Demos set during a blitz are a productivity stat only — reps still log
    // each demo properly via the modal, which feeds otherDemoSets. So only the
    // top-of-funnel activity (dials/connects/conversations) increments here.
    const month = monthKey(new Date());
    await prisma.historical.upsert({
      where: { month },
      create: { month, dials, connects, conversations },
      update: {
        dials: { increment: dials },
        connects: { increment: connects },
        conversations: { increment: conversations },
      },
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Couldn't save the session — try again." }, { status: 500 });
  }
}
