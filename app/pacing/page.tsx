import { prisma } from "@/lib/prisma";
import PacingCalculator from "../components/PacingCalculator";
import RecentDemos from "../components/RecentDemos";
import { currentMonthWorkingDays } from "@/lib/profile";
import type { Historical } from "@/lib/pacingMath";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
const isShow = (s: string) => ["SHOWED", "COMPLETED", "CLOSED_WON", "CLOSED_LOST"].includes(s);
const isComplete = (s: string) => ["COMPLETED", "CLOSED_WON", "CLOSED_LOST"].includes(s);

export default async function PacingPage() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [demoRows, profileRow] = await Promise.all([
    prisma.demoSet.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userProfile.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
  ]);

  // Sync the current month's demo-derived metrics from logged demos.
  const derived = {
    otherDemoSets: demoRows.length,
    demoShows: demoRows.filter((d) => isShow(d.status)).length,
    demoCompletes: demoRows.filter((d) => isComplete(d.status)).length,
    closedDeals: demoRows.filter((d) => d.status === "CLOSED_WON").length,
    revenue: demoRows
      .filter((d) => d.status === "CLOSED_WON")
      .reduce((s, d) => s + (d.dealRevenue ?? 0), 0),
    reliefs: demoRows.filter((d) => d.status === "RELIEF").length,
  };
  await prisma.historical.upsert({
    where: { month: monthKey },
    update: derived,
    create: { month: monthKey, ...derived },
  });

  const rows = await prisma.historical.findMany({ orderBy: { month: "desc" } });
  const historicals: Historical[] = rows.map((r) => ({
    id: r.id,
    month: r.month,
    dials: r.dials,
    connects: r.connects,
    conversations: r.conversations,
    orumDemoSets: r.orumDemoSets,
    otherDemoSets: r.otherDemoSets,
    demoShows: r.demoShows,
    demoCompletes: r.demoCompletes,
    closedDeals: r.closedDeals,
    revenue: r.revenue,
    reliefs: r.reliefs,
  }));

  // Weekly actuals (current month) from demo set dates.
  const weekOf = (day: number) => (day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3);
  const weekly = [0, 1, 2, 3].map((w) => {
    const wd = demoRows.filter((d) => weekOf(new Date(d.createdAt).getDate()) === w);
    return { demoSets: wd.length, completes: wd.filter((d) => isComplete(d.status)).length };
  });

  const demos = demoRows.map((d) => ({
    id: d.id,
    createdAt: d.createdAt.toISOString(),
    setType: d.setType,
    prospect: d.prospect,
    status: d.status,
    dealRevenue: d.dealRevenue,
  }));

  const workingDays = profileRow.workingDays ?? currentMonthWorkingDays();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <PacingCalculator
        historicals={historicals}
        currentMonth={monthKey}
        quota={profileRow.quota}
        tier={profileRow.tier}
        workingDays={workingDays}
        weekly={weekly}
      />
      <div className="mt-6">
        <RecentDemos initial={demos} />
      </div>
    </main>
  );
}
