import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const TASK_TYPES = ["FOLLOWUP", "CALL", "EMAIL", "TODO"];
const isType = (v: unknown) => typeof v === "string" && TASK_TYPES.includes(v);

// List tasks (newest first). ?done=false filters to open only.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const done = searchParams.get("done");
  const where = done === "false" ? { done: false } : done === "true" ? { done: true } : {};
  const rows = await prisma.task.findMany({
    where,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    include: { contact: { select: { id: true, name: true } } },
  });
  return NextResponse.json(rows);
}

// Create a task.
export async function POST(request: Request) {
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

  const row = await prisma.task.create({
    data: {
      title,
      type: isType(b.type) ? (b.type as string) : "FOLLOWUP",
      dueDate: b.dueDate ? new Date(String(b.dueDate)) : null,
      contactId: typeof b.contactId === "string" && b.contactId.trim() ? b.contactId.trim() : null,
      source: typeof b.source === "string" && b.source.trim() ? b.source.trim() : null,
    },
    include: { contact: { select: { id: true, name: true } } },
  });
  return NextResponse.json(row);
}
