import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseBrief } from "@/lib/memory";
import StarRating from "../components/StarRating";

// Always read fresh from the database.
export const dynamic = "force-dynamic";

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">History</h1>
        <p className="mt-1 text-[13px] text-muted">
          Every brief is saved here and fed into memory for future briefs.
        </p>
      </header>

      {briefs.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-ink">No briefs yet</p>
          <p className="text-[13px] text-muted">
            Generate your first brief and it&apos;ll show up here.
          </p>
          <Link href="/" className="btn-primary mt-1">
            Go to Brief Engine
          </Link>
        </div>
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
                        {shown.aeBrief.dealSummary}
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
