import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Add a historical month row.
export async function POST(request: Request) {
  let body: { month?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const month = (body.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Month must be YYYY-MM." }, { status: 400 });
  }
  const row = await prisma.historical.upsert({
    where: { month },
    update: {},
    create: { month },
  });
  return NextResponse.json(row);
}
