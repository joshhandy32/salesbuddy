import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ID = "default";

const defaults = {
  quota: 8,
  commissionModel: "percent",
  commissionRate: 3,
  flatBonus: 500,
};

// Return the singleton settings row, creating it with defaults if missing.
export async function GET() {
  const row = await prisma.pacingSettings.upsert({
    where: { id: DEFAULT_ID },
    update: {},
    create: { id: DEFAULT_ID, ...defaults },
  });
  return NextResponse.json(row);
}

// Update quota / commission model / rate / flat bonus.
export async function PATCH(request: Request) {
  let body: Partial<typeof defaults>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Partial<typeof defaults> = {};
  if (typeof body.quota === "number") data.quota = Math.max(0, body.quota);
  if (body.commissionModel === "percent" || body.commissionModel === "flat")
    data.commissionModel = body.commissionModel;
  if (typeof body.commissionRate === "number")
    data.commissionRate = Math.max(0, body.commissionRate);
  if (typeof body.flatBonus === "number")
    data.flatBonus = Math.max(0, body.flatBonus);

  const row = await prisma.pacingSettings.upsert({
    where: { id: DEFAULT_ID },
    update: data,
    create: { id: DEFAULT_ID, ...defaults, ...data },
  });
  return NextResponse.json(row);
}
