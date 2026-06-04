import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLeadStatus, isPriority } from "@/lib/crm";

type Row = {
  name?: string;
  email?: string;
  title?: string;
  company?: string;
  phone?: string;
  source?: string;
  priority?: string;
  status?: string;
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Bulk-import leads from parsed CSV rows. Resolves each row's company to an
// existing account (case-insensitive) or creates one, then creates the contact.
export async function POST(request: Request) {
  let body: { rows?: Row[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const valid = rows.filter((r) => clean(r.name));
  if (valid.length === 0) {
    return NextResponse.json({ error: "No rows with a name to import." }, { status: 400 });
  }
  if (valid.length > 1000) {
    return NextResponse.json({ error: "Import is capped at 1000 rows at a time." }, { status: 400 });
  }

  // Resolve company names to account ids, creating accounts as needed. Cache by
  // lowercased name so repeated companies in the file reuse one account.
  const existing = await prisma.account.findMany({ select: { id: true, name: true } });
  const byName = new Map(existing.map((a) => [a.name.toLowerCase(), a.id]));
  let accountsCreated = 0;

  async function accountFor(company: string): Promise<string | null> {
    const c = clean(company);
    if (!c) return null;
    const key = c.toLowerCase();
    const hit = byName.get(key);
    if (hit) return hit;
    const created = await prisma.account.create({ data: { name: c } });
    byName.set(key, created.id);
    accountsCreated++;
    return created.id;
  }

  let created = 0;
  for (const r of valid) {
    const accountId = await accountFor(r.company ?? "");
    await prisma.contact.create({
      data: {
        name: clean(r.name),
        email: clean(r.email) || null,
        title: clean(r.title) || null,
        phone: clean(r.phone) || null,
        accountId,
        source: clean(r.source) || null,
        status: isLeadStatus(r.status) ? r.status : "NEW",
        priority: isPriority(r.priority) ? r.priority : "MEDIUM",
      },
    });
    created++;
  }

  return NextResponse.json({ created, accountsCreated });
}
