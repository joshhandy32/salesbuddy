import { prisma } from "@/lib/prisma";
import { analyzeIcp } from "@/lib/icp";
import IcpAnalyzer from "../components/IcpAnalyzer";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ICP Analyzer" };

export default async function IcpPage() {
  const [demos, briefs] = await Promise.all([
    prisma.demoSet.findMany({
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
    prisma.brief.findMany({ select: { company: true, industry: true, dealSize: true } }),
  ]);

  const analysis = analyzeIcp(demos, briefs);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="ICP Analyzer"
        subtitle="What actually converts — your demo funnel sliced by channel, AE, day and time, then turned into an Ideal Customer Profile."
      />

      {analysis.totalDemos === 0 ? (
        <EmptyState
          title="No demos to analyze yet"
          message="The ICP Analyzer learns from your logged demo sets — their channel, timing, and outcome. Log a few demos and come back to see what converts."
          actionLabel="Log a demo set"
          actionHref="/commission"
          icon={<Target size={46} strokeWidth={1.4} />}
        />
      ) : (
        <IcpAnalyzer analysis={analysis} />
      )}
    </main>
  );
}
