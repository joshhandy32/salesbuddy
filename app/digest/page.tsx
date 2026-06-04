import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import { buildRepDigests } from "@/lib/digest";
import DigestTool from "../components/DigestTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coaching Digest" };

export default async function DigestPage() {
  const rows = await prisma.brief.findMany({ orderBy: { createdAt: "asc" } });
  const digests = buildRepDigests(rows.map(parseBrief));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Coaching Digest</h1>
        <p className="mt-1 text-[13px] text-muted">
          The manager view — per-rep coaching priorities pulled from your team&apos;s
          briefs, ratings, corrections, and feedback.
        </p>
      </header>

      <DigestTool digests={digests} />
    </main>
  );
}
