import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const CATEGORIES = ["OBJECTION", "OPENER", "VOICEMAIL", "EMAIL"] as const;
const isCategory = (c: unknown): c is (typeof CATEGORIES)[number] =>
  typeof c === "string" && (CATEGORIES as readonly string[]).includes(c);

// List all snippets (newest first).
export async function GET() {
  const rows = await prisma.snippet.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(rows);
}

// Create a snippet.
export async function POST(request: Request) {
  let body: { category?: string; title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim();
  const text = body.body?.trim();
  const category = isCategory(body.category) ? body.category : "OBJECTION";
  if (!title || !text) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const row = await prisma.snippet.create({ data: { title, body: text, category } });
  return NextResponse.json(row);
}
