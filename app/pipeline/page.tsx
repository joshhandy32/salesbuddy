import { prisma } from "@/lib/prisma";
import Pipeline from "../components/Pipeline";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const [rows, accounts, contacts] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
    }),
    prisma.account.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const deals = rows.map((d) => ({
    id: d.id,
    name: d.name,
    stage: d.stage,
    amount: d.amount,
    closeDate: d.closeDate ? d.closeDate.toISOString() : null,
    accountId: d.accountId,
    accountName: d.account?.name ?? null,
    contactId: d.contactId,
    contactName: d.contact?.name ?? null,
    notes: d.notes,
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <PageHeader
        title="Pipeline"
        subtitle="Every open opportunity by stage. Move deals as they progress; the weighted value updates live."
      />
      <Pipeline initial={deals} accounts={accounts} contacts={contacts} />
    </main>
  );
}
