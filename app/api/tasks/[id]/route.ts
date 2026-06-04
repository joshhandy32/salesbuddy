import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TASK_TYPES } from "../route";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof b.title === "string" && b.title.trim()) data.title = b.title.trim();
  if (typeof b.type === "string" && TASK_TYPES.includes(b.type)) data.type = b.type;
  if ("dueDate" in b) data.dueDate = b.dueDate ? new Date(String(b.dueDate)) : null;
  if (typeof b.done === "boolean") {
    data.done = b.done;
    data.doneAt = b.done ? new Date() : null;
  }

  try {
    const row = await prisma.task.update({
      where: { id },
      data,
      include: { contact: { select: { id: true, name: true } } },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
}

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
}
