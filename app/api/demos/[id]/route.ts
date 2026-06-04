import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUSES = [
  "SET",
  "SHOWED",
  "NO_SHOW",
  "RESCHEDULED",
  "COMPLETED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "RELIEF",
];

// Update a demo's status and/or revenue (inline editing in Recent Demos).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { status?: string; dealRevenue?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status && STATUSES.includes(body.status)) {
    data.status = body.status;
    const now = new Date();
    if (body.status === "SHOWED") data.shownDate = now;
    if (body.status === "COMPLETED") data.completedDate = now;
    if (body.status === "CLOSED_WON" || body.status === "CLOSED_LOST")
      data.closedDate = now;
    // Clear revenue if it's no longer a won deal.
    if (body.status !== "CLOSED_WON") data.dealRevenue = null;
  }
  if (body.dealRevenue === null) data.dealRevenue = null;
  else if (typeof body.dealRevenue === "number")
    data.dealRevenue = Math.max(0, body.dealRevenue);

  try {
    const row = await prisma.demoSet.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Demo not found." }, { status: 404 });
  }
}
