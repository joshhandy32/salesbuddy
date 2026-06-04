import { prisma } from "@/lib/prisma";
import Leads from "../components/Leads";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [rows, accounts] = await Promise.all([
    prisma.contact.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: { account: { select: { id: true, name: true } } },
    }),
    prisma.account.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const leads = rows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    title: c.title,
    status: c.status,
    source: c.source,
    priority: c.priority,
    accountId: c.accountId,
    accountName: c.account?.name ?? null,
    notes: c.notes,
    lastTouchedAt: c.lastTouchedAt ? c.lastTouchedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader
        title="Leads & Prospecting"
        subtitle="Work your list — prioritize, advance status, log touches, and convert hot leads into pipeline."
      />
      <Leads initial={leads} accounts={accounts} />
    </main>
  );
}
