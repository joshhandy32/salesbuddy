import { prisma } from "@/lib/prisma";
import Cadences from "../components/Cadences";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cadences" };

type Step = { day: number; type: string; title: string };

export default async function CadencesPage() {
  const [rows, contacts] = await Promise.all([
    prisma.cadence.findMany({ orderBy: { name: "asc" } }),
    prisma.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const cadences = rows.map((c) => {
    let steps: Step[] = [];
    try {
      steps = JSON.parse(c.steps);
    } catch {
      steps = [];
    }
    return { id: c.id, name: c.name, steps };
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <PageHeader
        title="Outreach Cadences"
        subtitle="Build a repeatable multi-touch sequence once, then enroll a contact to drop every step onto your task list, dated automatically."
      />
      <Cadences initial={cadences} contacts={contacts} />
    </main>
  );
}
