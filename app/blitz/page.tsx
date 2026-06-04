import { prisma } from "@/lib/prisma";
import BlitzTracker from "../components/BlitzTracker";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Call Blitz" };

type Counts = { dials: number; connects: number; conversations: number; demosSet: number };

function sum(rows: { dials: number; connects: number; conversations: number; demosSet: number }[]): Counts {
  return rows.reduce<Counts>(
    (t, r) => ({
      dials: t.dials + r.dials,
      connects: t.connects + r.connects,
      conversations: t.conversations + r.conversations,
      demosSet: t.demosSet + r.demosSet,
    }),
    { dials: 0, connects: 0, conversations: 0, demosSet: 0 },
  );
}

export default async function BlitzPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [recentRows, todayRows, weekRows] = await Promise.all([
    prisma.blitzSession.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.blitzSession.findMany({ where: { createdAt: { gte: todayStart } } }),
    prisma.blitzSession.findMany({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  const recent = recentRows.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    durationSec: s.durationSec,
    dials: s.dials,
    connects: s.connects,
    conversations: s.conversations,
    demosSet: s.demosSet,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Call Blitz"
        subtitle="Run a focused power hour — tap to count dials, connects, conversations, and demos. Saved sessions feed your pacing automatically."
      />
      <BlitzTracker
        recent={recent}
        todayTotals={{ ...sum(todayRows), sessions: todayRows.length }}
        weekTotals={sum(weekRows)}
      />
    </main>
  );
}
