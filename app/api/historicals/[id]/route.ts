import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INT_FIELDS = [
  "dials",
  "connects",
  "conversations",
  "orumDemoSets",
  "otherDemoSets",
  "demoShows",
  "demoCompletes",
  "closedDeals",
  "reliefs",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Record<string, number> = {};
  for (const f of INT_FIELDS) {
    if (typeof body[f] === "number") data[f] = Math.max(0, Math.round(body[f] as number));
  }
  if (typeof body.revenue === "number") data.revenue = Math.max(0, body.revenue as number);

  try {
    const row = await prisma.historical.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.historical.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }
}
