import { prisma } from "@/lib/prisma";
import Playbook from "../components/Playbook";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Playbook" };

export default async function PlaybookPage() {
  const rows = await prisma.snippet.findMany({ orderBy: { updatedAt: "desc" } });
  const snippets = rows.map((s) => ({
    id: s.id,
    category: s.category,
    title: s.title,
    body: s.body,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Playbook"
        subtitle="Your objection rebuttals, openers, voicemails, and email snippets — searchable and one click to copy."
      />
      <Playbook initial={snippets} />
    </main>
  );
}
