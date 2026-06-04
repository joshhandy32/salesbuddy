import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { buildRepDigests } from "@/lib/digest";
import DigestTool from "../components/DigestTool";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coaching Digest" };

export default async function DigestPage() {
  const rows = await prisma.brief.findMany({ orderBy: { createdAt: "asc" } });
  const digests = buildRepDigests(rows.map(parseBrief));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Coaching Digest"
        subtitle="The manager view — per-rep coaching priorities from your team's briefs, ratings, corrections, and feedback."
      />

      <DigestTool digests={digests} />
    </main>
  );
}
