import { prisma } from "@/lib/prisma";
import CommissionTracker from "../components/CommissionTracker";
import RecentDemos from "../components/RecentDemos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commission Tracker" };

const pad = (n: number) => String(n).padStart(2, "0");
const isComplete = (s: string) => ["COMPLETED", "CLOSED_WON", "CLOSED_LOST"].includes(s);

export default async function CommissionPage() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [demoRows, profile, recapRows] = await Promise.all([
    prisma.demoSet.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userProfile.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.recap.findMany({ orderBy: { submittedAt: "desc" } }),
  ]);

  const closedWon = demoRows.filter((d) => d.status === "CLOSED_WON");
  const completes = demoRows.filter((d) => isComplete(d.status)).length;
  const closedDeals = closedWon.length;
  const revenue = closedWon.reduce((s, d) => s + (d.dealRevenue ?? 0), 0);
  const reliefs = demoRows.filter((d) => d.status === "RELIEF").length;
  const commissionOwed =
    profile.commissionModel === "percent"
      ? revenue * (profile.commissionRate / 100)
      : closedDeals * profile.flatBonus;
  const attainment = profile.quota > 0 ? completes / profile.quota : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, daysInMonth - now.getDate());

  const metrics = {
    commissionOwed,
    attainment,
    completes,
    closedDeals,
    daysLeft,
    reliefs,
    revenue,
    quota: profile.quota,
  };

  const recaps = recapRows.map((r) => ({
    id: r.id,
    month: r.month,
    commissionOwed: r.commissionOwed,
    revenue: r.revenue,
    completes: r.completes,
    closedDeals: r.closedDeals,
    reliefs: r.reliefs,
    quota: r.quota,
    attainment: r.attainment,
    status: r.status,
    managerNotes: r.managerNotes,
    submittedAt: r.submittedAt.toISOString(),
  }));

  const demos = demoRows.map((d) => ({
    id: d.id,
    createdAt: d.createdAt.toISOString(),
    setType: d.setType,
    prospect: d.prospect,
    status: d.status,
    dealRevenue: d.dealRevenue,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <CommissionTracker month={monthKey} name={profile.name} metrics={metrics} recaps={recaps} />
      <div className="mt-6">
        <RecentDemos initial={demos} />
      </div>
    </main>
  );
}
