import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ID = "default";

export async function GET() {
  const row = await prisma.userProfile.upsert({
    where: { id: ID },
    update: {},
    create: { id: ID },
  });
  return NextResponse.json(row);
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.slice(0, 120);
  if (body.role === "BDR" || body.role === "AE" || body.role === "Manager")
    data.role = body.role;
  if (typeof body.quota === "number") data.quota = Math.max(0, Math.round(body.quota));
  if (["BDR1", "BDR2", "BDR3", "AE"].includes(body.tier as string))
    data.tier = body.tier;
  if (body.workingDays === null) data.workingDays = null;
  else if (typeof body.workingDays === "number")
    data.workingDays = Math.max(0, Math.round(body.workingDays));
  if (body.commissionModel === "percent" || body.commissionModel === "flat")
    data.commissionModel = body.commissionModel;
  if (typeof body.commissionRate === "number")
    data.commissionRate = Math.max(0, body.commissionRate);
  if (typeof body.flatBonus === "number")
    data.flatBonus = Math.max(0, body.flatBonus);

  const row = await prisma.userProfile.upsert({
    where: { id: ID },
    update: data,
    create: { id: ID, ...data },
  });
  return NextResponse.json(row);
}
