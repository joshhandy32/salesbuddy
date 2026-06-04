import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Approve / reject a recap or edit manager notes.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { status?: string; managerNotes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const data: Record<string, string> = {};
  if (body.status && ["PENDING", "APPROVED", "REJECTED"].includes(body.status))
    data.status = body.status;
  if (typeof body.managerNotes === "string") data.managerNotes = body.managerNotes;

  try {
    const row = await prisma.recap.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Recap not found." }, { status: 404 });
  }
}
