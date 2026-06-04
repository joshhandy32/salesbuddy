import { prisma } from "@/lib/prisma";
import OutreachComposer from "../components/OutreachComposer";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email Outreach" };

export default async function OutreachPage() {
  const rows = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: { account: { select: { name: true, industry: true } } },
  });
  const contacts = rows.map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    email: c.email,
    company: c.account?.name ?? null,
    industry: c.account?.industry ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Email Outreach"
        subtitle="Draft a personalized email in seconds. Pick a contact, set the goal, and let AI write a tight first draft you can edit, copy, and log."
      />
      <OutreachComposer contacts={contacts} />
    </main>
  );
}
