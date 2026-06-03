import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// List historical months (newest first).
export async function GET() {
  const rows = await prisma.pacingMonth.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

// Add a past month to the historicals table.
export async function POST(request: Request) {
  let body: {
    month?: string;
    sets?: number;
    shows?: number;
    completes?: number;
    quota?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.month?.trim()) {
    return NextResponse.json({ error: "Month label is required." }, { status: 400 });
  }

  const row = await prisma.pacingMonth.create({
    data: {
      month: body.month.trim(),
      sets: Math.max(0, Number(body.sets) || 0),
      shows: Math.max(0, Number(body.shows) || 0),
      completes: Math.max(0, Number(body.completes) || 0),
      quota: Math.max(0, Number(body.quota) || 0),
    },
  });
  return NextResponse.json(row);
}
