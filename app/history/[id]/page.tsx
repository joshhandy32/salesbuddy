import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import BriefResultPanel from "../../components/BriefResultPanel";

export const dynamic = "force-dynamic";

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.brief.findUnique({ where: { id } });
  if (!row) notFound();

  const brief = parseBrief(row);
  const date = new Date(brief.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link
        href="/history"
        className="mb-4 inline-block text-[13px] font-medium text-link hover:underline"
      >
        ← Back to history
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">Saved brief</h1>
        <span className="text-[13px] text-muted">{date}</span>
        {brief.repName && <span className="pill">{brief.repName}</span>}
      </header>

      <BriefResultPanel initial={brief} />
    </main>
  );
}
