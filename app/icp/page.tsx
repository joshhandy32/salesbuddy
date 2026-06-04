import { prisma } from "@/lib/prisma";
import { analyzeIcp, normalizeWindow, windowCutoff } from "@/lib/icp";
import IcpAnalyzer from "../components/IcpAnalyzer";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ICP Analyzer" };

export default async function IcpPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const win = normalizeWindow((await searchParams).window);
  const cutoff = windowCutoff(win);
  const createdFilter = cutoff ? { createdAt: { gte: cutoff } } : {};

  const [demos, briefs, totalEver] = await Promise.all([
    prisma.demoSet.findMany({
      where: createdFilter,
      select: {
        setType: true,
        prospect: true,
        need: true,
        status: true,
        demoDate: true,
        aeName: true,
        dealRevenue: true,
      },
    }),
    prisma.brief.findMany({
      where: createdFilter,
      select: { company: true, industry: true, dealSize: true },
    }),
    prisma.demoSet.count(),
  ]);

  const analysis = analyzeIcp(demos, briefs);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="ICP Analyzer"
        subtitle="What actually converts — your demo funnel sliced by channel, AE, day and time, then turned into an Ideal Customer Profile."
      />

      {totalEver === 0 ? (
        <EmptyState
          title="No demos to analyze yet"
          message="The ICP Analyzer learns from your logged demo sets — their channel, timing, and outcome. Log a few demos and come back to see what converts."
          actionLabel="Log a demo set"
          actionHref="/commission"
          icon={<Target size={46} strokeWidth={1.4} />}
        />
      ) : (
        <IcpAnalyzer analysis={analysis} window={win} />
      )}
    </main>
  );
}
