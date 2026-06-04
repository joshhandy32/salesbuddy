import { prisma } from "@/lib/prisma";
import { forecastByMonth, forecastTotals } from "@/lib/crm";
import Forecast from "../components/Forecast";
import PageHeader from "../components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forecast" };

export default async function ForecastPage() {
  const rows = await prisma.deal.findMany({
    orderBy: { closeDate: "asc" },
    include: { account: { select: { name: true } } },
  });

  const deals = rows.map((d) => ({
    id: d.id,
    name: d.name,
    stage: d.stage,
    amount: d.amount,
    closeDate: d.closeDate ? d.closeDate.toISOString() : null,
    accountName: d.account?.name ?? null,
  }));

  const months = forecastByMonth(deals);
  const totals = forecastTotals(deals);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Forecast"
        subtitle="Where your open pipeline lands by close month — best case, probability-weighted, and commit."
      />
      <Forecast deals={deals} months={months} totals={totals} />
    </main>
  );
}
