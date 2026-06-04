import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Submit a monthly commission recap (status PENDING).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const month = String(body.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Month must be YYYY-MM." }, { status: 400 });
  }
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  const row = await prisma.recap.create({
    data: {
      month,
      commissionOwed: n(body.commissionOwed),
      revenue: n(body.revenue),
      completes: Math.round(n(body.completes)),
      closedDeals: Math.round(n(body.closedDeals)),
      reliefs: Math.round(n(body.reliefs)),
      quota: Math.round(n(body.quota)),
      attainment: n(body.attainment),
    },
  });
  return NextResponse.json(row);
}
