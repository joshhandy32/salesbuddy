import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import StarRating from "../components/StarRating";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

// Always read fresh from the database.
export const dynamic = "force-dynamic";
export const metadata = { title: "Brief History" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HistoryPage() {
  const rows = await prisma.brief.findMany({ orderBy: { createdAt: "desc" } });
  const briefs = rows.map(parseBrief);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Brief History"
        subtitle="Every brief is saved here and fed into memory for future briefs."
      />

      {briefs.length === 0 ? (
        <EmptyState
          title="No briefs yet"
          message="Generate your first brief to get started — it'll show up here with its rating and any corrections."
          actionLabel="Go to Brief Engine"
          actionHref="/brief"
        />
      ) : (
        <ul className="space-y-3">
          {briefs.map((b) => {
            const shown = b.corrected ?? b.result;
            return (
              <li key={b.id}>
                <Link
                  href={`/history/${b.id}`}
                  className="card block px-5 py-4 transition-shadow hover:shadow-coral"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {shown.aeBrief?.dealSummary || "Untitled brief"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        <span>{formatDate(b.createdAt)}</span>
                        {b.repName && (
                          <>
                            <span>·</span>
                            <span className="pill">{b.repName}</span>
                          </>
                        )}
                        {b.corrected && (
                          <span className="pill pill-coral">Edited</span>
                        )}
                        {b.feedbackNote && (
                          <span className="pill pill-teal">Feedback</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <StarRating value={b.rating} readOnly />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
