import { prisma } from "@/lib/prisma";
import Tasks from "../components/Tasks";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const [rows, contacts] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      take: 300,
      include: { contact: { select: { id: true, name: true } } },
    }),
    prisma.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const tasks = rows.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    done: t.done,
    source: t.source,
    contactId: t.contactId,
    contactName: t.contact?.name ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <PageHeader
        title="Tasks & Follow-ups"
        subtitle="Everything you owe a prospect, in one list. Overdue first — check them off as you go."
      />
      <Tasks initial={tasks} contacts={contacts} />
    </main>
  );
}
