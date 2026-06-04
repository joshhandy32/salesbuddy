import { prisma } from "@/lib/prisma";
import Accounts from "../components/Accounts";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const rows = await prisma.account.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });
  const accounts = rows.map((a) => ({
    id: a.id,
    name: a.name,
    domain: a.domain,
    industry: a.industry,
    size: a.size,
    website: a.website,
    ownerName: a.ownerName,
    notes: a.notes,
    contacts: a._count.contacts,
    deals: a._count.deals,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Accounts"
        subtitle="Every company you're working — contacts, open deals, and notes in one place."
      />
      <Accounts initial={accounts} />
    </main>
  );
}
