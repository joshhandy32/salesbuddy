import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Log a demo set to the commission tracker.
export async function POST(request: Request) {
  let body: {
    setType?: string;
    prospect?: string;
    need?: string;
    demoDate?: string;
    aeName?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const setType = (body.setType || "").trim();
  const prospect = (body.prospect || "").trim();
  const demoDate = body.demoDate;

  if (!setType || !prospect || !demoDate) {
    return NextResponse.json(
      { error: "Set type, prospect, and demo date are required." },
      { status: 400 },
    );
  }
  const d = new Date(demoDate);
  if (isNaN(d.getTime())) {
    return NextResponse.json({ error: "Invalid demo date." }, { status: 400 });
  }

  const row = await prisma.demoSet.create({
    data: {
      setType,
      prospect,
      need: (body.need || "").trim(),
      demoDate: d,
      aeName: (body.aeName || "").trim() || null,
      notes: (body.notes || "").trim() || null,
    },
  });
  return NextResponse.json(row);
}
