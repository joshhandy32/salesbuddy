import { prisma } from "@/lib/prisma";
import PacingTool from "../components/PacingTool";
import RecentDemos from "../components/RecentDemos";
import type { CommissionModel } from "@/lib/pacing";

export const dynamic = "force-dynamic";

const DEFAULT_ID = "default";

export default async function PacingPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Settings + historical months + this month's logged demo-set count.
  const [settingsRow, months, loggedSets, demoRows] = await Promise.all([
    prisma.pacingSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {},
      create: { id: DEFAULT_ID },
    }),
    prisma.pacingMonth.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.demoSet.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.demoSet.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const demos = demoRows.map((d) => ({
    id: d.id,
    createdAt: d.createdAt.toISOString(),
    setType: d.setType,
    prospect: d.prospect,
    status: d.status,
    dealRevenue: d.dealRevenue,
  }));

  const settings = {
    quota: settingsRow.quota,
    commissionModel: settingsRow.commissionModel as CommissionModel,
    commissionRate: settingsRow.commissionRate,
    flatBonus: settingsRow.flatBonus,
  };

  // Today's date (YYYY-MM-DD) for the time-pacing default.
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Pacing &amp; Commission</h1>
        <p className="mt-1 text-[13px] text-muted">
          Track quota pacing in completes, back-solve the demos you need, and
          project commission. Everything saves locally — nothing to re-enter.
        </p>
      </header>

      <PacingTool
        initialSettings={settings}
        initialMonths={months}
        today={today}
        loggedSets={loggedSets}
      />

      <div className="mt-6">
        <RecentDemos initial={demos} />
      </div>
    </main>
  );
}
