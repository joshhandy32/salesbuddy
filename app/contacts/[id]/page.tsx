import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactDetail from "../../components/ContactDetail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.contact.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      deals: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      demoSets: { orderBy: { demoDate: "desc" } },
      tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
    },
  });
  if (!c) notFound();

  return (
    <ContactDetail
      contact={{
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        title: c.title,
        status: c.status,
        source: c.source,
        priority: c.priority,
        notes: c.notes,
        accountId: c.accountId,
        accountName: c.account?.name ?? null,
        lastTouchedAt: c.lastTouchedAt ? c.lastTouchedAt.toISOString() : null,
      }}
      deals={c.deals.map((d) => ({
        id: d.id,
        name: d.name,
        stage: d.stage,
        amount: d.amount,
      }))}
      activities={c.activities.map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        body: a.body,
        createdAt: a.createdAt.toISOString(),
      }))}
      demos={c.demoSets.map((d) => ({
        id: d.id,
        setType: d.setType,
        status: d.status,
        demoDate: d.demoDate.toISOString(),
      }))}
      tasks={c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        done: t.done,
      }))}
    />
  );
}
