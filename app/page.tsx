import Link from "next/link";
import type { Metadata } from "next";
import {
  FileText,
  CalendarCheck2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  CalendarRange,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { briefDisplayTitle } from "@/lib/briefTitle";
import { pipelineSummary, money as crmMoney } from "@/lib/crm";
import HomeChart from "./components/HomeChart";
import HomeActions, { LogDemoTextLink } from "./components/HomeActions";
import StarRating from "./components/StarRating";
import DemoFollowUps from "./components/DemoFollowUps";
import { Users, KanbanSquare, CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today" };

const isComplete = (s: string) => ["COMPLETED", "CLOSED_WON", "CLOSED_LOST"].includes(s);
const money = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

function briefRowTitle(b: { company: string | null; result: string; flagged: boolean }) {
  if (b.company && b.company.trim()) return { title: b.company.trim(), failed: false };
  let summary: string | undefined;
  try {
    summary = JSON.parse(b.result)?.aeBrief?.dealSummary;
  } catch {
    summary = undefined;
  }
  return briefDisplayTitle(summary, b.flagged);
}

// ── Demo status pill palette (semantic, AA-legible dark text on pale tints) ──
const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  SET: { l: "Set", bg: "#f3f4f6", c: "#6a7282" },
  SHOWED: { l: "Showed", bg: "rgba(43,127,255,0.10)", c: "#1d6fe0" },
  RESCHEDULED: { l: "Resched", bg: "#fff7ed", c: "#b45309" },
  NO_SHOW: { l: "No show", bg: "#f3f4f6", c: "#6a7282" },
  COMPLETED: { l: "Completed", bg: "rgba(0,212,146,0.16)", c: "#047857" },
  CLOSED_WON: { l: "Won", bg: "rgba(0,212,146,0.20)", c: "#047857" },
  CLOSED_LOST: { l: "Lost", bg: "#f3f4f6", c: "#6a7282" },
  RELIEF: { l: "Relief", bg: "#f3f4f6", c: "#6a7282" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { l: status, bg: "#f3f4f6", c: "#6a7282" };
  return (
    <span
      className="shrink-0 rounded-[6px] px-2 py-0.5 text-[12px] font-medium"
      style={{ background: s.bg, color: s.c }}
    >
      {s.l}
    </span>
  );
}

function ChannelPill({ type }: { type: string }) {
  return (
    <span
      className="shrink-0 rounded-[6px] border px-2 py-0.5 text-[12px] font-semibold"
      style={{ background: "#fff7ed", color: "#eb7360", borderColor: "#f3d9c4" }}
    >
      {type}
    </span>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  context,
  Icon,
  chipBg,
  chipColor,
  delay,
}: {
  label: string;
  value: string;
  valueColor?: string;
  context: string;
  Icon: typeof FileText;
  chipBg: string;
  chipColor: string;
  delay: number;
}) {
  return (
    <div
      className="home-rise home-card-lift rounded-[8px] border border-[#e5e7eb] bg-white p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#6a7282]">
            {label}
          </div>
          <div
            className="mt-2 text-[32px] font-extrabold leading-none"
            style={{ color: valueColor ?? "#101828" }}
          >
            {value}
          </div>
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: chipBg }}
        >
          <Icon size={20} strokeWidth={2} style={{ color: chipColor }} />
        </span>
      </div>
      <div className="mt-2 text-[12px] text-[#99a1af]">{context}</div>
    </div>
  );
}

export default async function Home() {
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const y = now.getFullYear();
  const mo = now.getMonth();
  const monthStart = new Date(y, mo, 1);
  const monthEnd = new Date(y, mo + 1, 1);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  // Demo dates are stored as UTC-midnight calendar days (from a date input), so
  // compare against UTC midnight of today's calendar date — otherwise a demo
  // scheduled for today reads as "past due" in timezones behind UTC.
  const todayStart = new Date(Date.UTC(y, mo, now.getDate()));

  const [
    profile,
    recentBriefs,
    recentDemos,
    demosThisMonth,
    briefsThisWeek,
    briefsPrevWeek,
    demosThisWeek,
    totalBriefs,
    totalDemos,
    pastDueDemos,
    allDeals,
    activeLeads,
    dueTasks,
  ] = await Promise.all([
    prisma.userProfile.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.brief.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, company: true, repName: true, rating: true, result: true, flagged: true },
    }),
    prisma.demoSet.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.demoSet.findMany({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.brief.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.brief.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.demoSet.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.brief.count(),
    prisma.demoSet.count(),
    // Demos whose scheduled date has passed but that are still open (not yet
    // resolved to an outcome) — surfaced as "Needs attention".
    prisma.demoSet.findMany({
      where: {
        demoDate: { lt: todayStart },
        status: { in: ["SET", "SHOWED", "RESCHEDULED"] },
      },
      orderBy: { demoDate: "asc" },
      take: 8,
      select: { id: true, prospect: true, setType: true, status: true, demoDate: true },
    }),
    // CRM: all deals (for pipeline summary) and active-lead count.
    prisma.deal.findMany({ select: { stage: true, amount: true } }),
    prisma.contact.count({ where: { status: { in: ["NEW", "WORKING", "QUALIFIED"] } } }),
    // Open tasks due today or overdue (UTC-midnight of tomorrow, matching how
    // date-only dueDates are stored).
    prisma.task.findMany({
      where: {
        done: false,
        dueDate: { lt: new Date(Date.UTC(y, mo, now.getDate() + 1)) },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { contact: { select: { id: true, name: true } } },
    }),
  ]);

  const pipeline = pipelineSummary(allDeals);
  const hasCrm = allDeals.length > 0 || activeLeads > 0;

  const followUps = pastDueDemos.map((d) => ({
    id: d.id,
    prospect: d.prospect,
    setType: d.setType,
    status: d.status,
    demoDate: d.demoDate.toISOString(),
  }));

  // ── Derived stats ──
  const completes = demosThisMonth.filter((d) => isComplete(d.status)).length;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const projection = daysElapsed > 0 ? (completes / daysElapsed) * daysInMonth : 0;
  const quota = profile.quota;
  const onPace = completes > 0 && projection >= quota;
  const behind = Math.max(0, Math.ceil(quota - projection));
  const needMore = Math.max(0, Math.ceil(quota - completes));

  const closedWon = demosThisMonth.filter((d) => d.status === "CLOSED_WON");
  const revenue = closedWon.reduce((s, d) => s + (d.dealRevenue ?? 0), 0);
  const commissionMTD =
    profile.commissionModel === "percent"
      ? revenue * (profile.commissionRate / 100)
      : closedWon.length * profile.flatBonus;
  const commissionProjected =
    daysElapsed > 0 ? (commissionMTD / daysElapsed) * daysInMonth : commissionMTD;

  // ── Chart: cumulative completes per day, through today ──
  // (Cumulative rather than per-day so the quota reference line and the
  // "X of Y quota" subtitle read together — noted in the handoff.)
  const perDay = new Array(daysInMonth).fill(0);
  demosThisMonth
    .filter((d) => isComplete(d.status))
    .forEach((d) => {
      const dt = d.completedDate ?? d.createdAt;
      const day = new Date(dt).getDate();
      if (day >= 1 && day <= daysInMonth) perDay[day - 1] += 1;
    });
  let run = 0;
  const chartData: { day: number; completes: number }[] = [];
  for (let i = 0; i < daysElapsed; i++) {
    run += perDay[i];
    chartData.push({ day: i + 1, completes: run });
  }
  const monthLabel = now.toLocaleDateString("en-US", { month: "long" });
  const monthShort = now.toLocaleDateString("en-US", { month: "short" });

  // ── Header copy ──
  const firstName = profile.name?.trim() ? profile.name.trim().split(/\s+/)[0] : "";
  const isNew = totalBriefs === 0 && totalDemos === 0;
  const contextLine = isNew
    ? "Set up your first brief or log a demo to get started."
    : `You have ${demosThisMonth.length} demos this month · ${completes} completes · Commission MTD: ${money(commissionMTD)}`;

  // ── Stat card view-models ──
  const briefsHas = briefsThisWeek > 0;
  const briefsCtx = briefsHas
    ? briefsPrevWeek > 0
      ? `vs ${briefsPrevWeek} last week`
      : "First briefs this week"
    : "Start generating briefs.";
  const demosHas = demosThisMonth.length > 0;
  const pacingHas = completes > 0;
  const commHas = commissionMTD > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-8 pt-16 sm:pt-8">
      {/* extra top padding on mobile clears the app shell's floating menu button */}
      <style>{`
        @keyframes home-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .home-rise { animation: home-rise 300ms ease-out both; }
        .home-row { transition: background-color 150ms ease; }
        .home-row:hover { background-color: #f8fafc; cursor: pointer; }
        .home-card-lift { transition: box-shadow 200ms ease; }
        .home-card-lift:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .home-focus:focus-visible { outline: 2px solid #eb7360; outline-offset: 2px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) { .home-rise { animation: none; } }
      `}</style>

      {/* Header band */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold leading-tight text-[#101828]">
            Good {partOfDay}
            {firstName ? (
              <>
                , <span className="capitalize">{firstName}</span>
              </>
            ) : null}{" "}
            👋
          </h1>
          <p className="mt-1 text-[14px] text-[#6a7282]">{contextLine}</p>
        </div>
        <HomeActions />
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Briefs this week"
          value={briefsHas ? String(briefsThisWeek) : "—"}
          valueColor={briefsHas ? undefined : "#99a1af"}
          context={briefsCtx}
          Icon={FileText}
          chipBg="rgba(235,115,96,0.10)"
          chipColor="#eb7360"
          delay={0}
        />
        <StatCard
          label="Demos logged"
          value={demosHas ? String(demosThisMonth.length) : "—"}
          valueColor={demosHas ? undefined : "#99a1af"}
          context={demosHas ? `${demosThisWeek} this week` : "No data yet."}
          Icon={CalendarCheck2}
          chipBg="rgba(43,127,255,0.10)"
          chipColor="#2b7fff"
          delay={50}
        />
        <StatCard
          label="Pacing"
          value={!pacingHas ? "—" : onPace ? "On pace ✓" : `Behind ${behind}`}
          valueColor={!pacingHas ? "#99a1af" : onPace ? "#2d9e70" : "#d4533f"}
          context={pacingHas ? `${completes} of ${quota} completes this month` : "No data yet."}
          Icon={TrendingUp}
          chipBg="rgba(0,212,146,0.14)"
          chipColor="#00a877"
          delay={100}
        />
        <StatCard
          label="Commission MTD"
          value={commHas ? money(commissionMTD) : "—"}
          valueColor={commHas ? undefined : "#99a1af"}
          context={commHas ? `Projected: ${money(commissionProjected)} at run rate` : "No data yet."}
          Icon={DollarSign}
          chipBg="rgba(54,65,83,0.08)"
          chipColor="#364153"
          delay={150}
        />
      </div>

      {/* Needs attention — past-due demos still open (only renders when any) */}
      {followUps.length > 0 && (
        <div className="mt-5">
          <DemoFollowUps initial={followUps} />
        </div>
      )}

      {/* Follow-ups due today / overdue */}
      {dueTasks.length > 0 && (
        <section className="mt-5 rounded-[8px] border border-[#e5e7eb] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#101828]">
              <CheckSquare size={18} className="text-[#00a877]" /> Follow-ups due
            </h2>
            <Link href="/tasks" className="home-focus text-[14px] font-medium text-[#eb7360]">
              All tasks →
            </Link>
          </div>
          <ul className="[&>li:last-child>a]:border-b-0">
            {dueTasks.map((t) => {
              const overdue = t.dueDate ? t.dueDate < todayStart : false;
              return (
                <li key={t.id}>
                  <Link
                    href={t.contactId ? `/contacts/${t.contactId}` : "/tasks"}
                    className="home-row home-focus flex min-h-[44px] items-center justify-between gap-3 border-b border-[#f3f4f6] px-2"
                  >
                    <span className="min-w-0 truncate text-[14px] text-[#101828]">
                      {t.title}
                      {t.contact?.name && <span className="text-[#99a1af]"> · {t.contact.name}</span>}
                    </span>
                    <span className={`shrink-0 text-[12px] ${overdue ? "font-semibold text-[#d4533f]" : "text-[#99a1af]"}`}>
                      {overdue ? "Overdue" : "Today"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Pipeline & leads snapshot */}
      {hasCrm && (
        <section className="mt-5 rounded-[8px] border border-[#e5e7eb] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#101828]">Pipeline & leads</h2>
            <Link href="/pipeline" className="home-focus text-[14px] font-medium text-[#eb7360]">
              Open pipeline →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Link href="/pipeline" className="home-card-lift rounded-[8px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#6a7282]">
                <KanbanSquare size={14} className="text-[#2b7fff]" /> Open deals
              </div>
              <div className="mt-2 text-[26px] font-extrabold leading-none text-[#101828]">
                {pipeline.openCount}
              </div>
            </Link>
            <Link href="/pipeline" className="home-card-lift rounded-[8px] border border-[#e5e7eb] bg-white p-4">
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#6a7282]">
                Open value
              </div>
              <div className="mt-2 text-[26px] font-extrabold leading-none text-[#101828]">
                {crmMoney(pipeline.openValue)}
              </div>
            </Link>
            <Link href="/pipeline" className="home-card-lift rounded-[8px] border border-[#e5e7eb] bg-white p-4">
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#6a7282]">
                Weighted
              </div>
              <div className="mt-2 text-[26px] font-extrabold leading-none text-[#eb7360]">
                {crmMoney(pipeline.weightedValue)}
              </div>
            </Link>
            <Link href="/leads" className="home-card-lift rounded-[8px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#6a7282]">
                <Users size={14} className="text-[#00a877]" /> Active leads
              </div>
              <div className="mt-2 text-[26px] font-extrabold leading-none text-[#101828]">
                {activeLeads}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Two-column content */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Briefs */}
        <section className="rounded-[8px] border border-[#e5e7eb] bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#101828]">Recent briefs</h2>
            <Link href="/history" className="home-focus text-[14px] font-medium text-[#eb7360]">
              View all →
            </Link>
          </div>
          {recentBriefs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ClipboardList size={48} strokeWidth={1.5} className="text-[#e5e7eb]" />
              <p className="text-[16px] font-semibold text-[#101828]">No briefs yet</p>
              <Link href="/brief" className="home-focus text-[14px] font-medium text-[#eb7360]">
                Generate your first brief →
              </Link>
            </div>
          ) : (
            <ul className="[&>li:last-child>a]:border-b-0">
              {recentBriefs.map((b) => {
                const { title, failed } = briefRowTitle(b);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/history/${b.id}`}
                      className="home-row home-focus flex min-h-[48px] items-center justify-between gap-3 border-b border-[#f3f4f6] px-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {failed && (
                            <span
                              title="AI extraction failed — try regenerating."
                              className="shrink-0 text-[#eb7360]"
                            >
                              <AlertTriangle size={13} />
                            </span>
                          )}
                          <span className="truncate text-[14px] font-semibold text-[#101828]">
                            {title}
                          </span>
                        </div>
                        {b.repName && (
                          <div className="text-[12px] capitalize text-[#6a7282]">{b.repName}</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        {b.rating ? <StarRating value={b.rating} readOnly /> : null}
                        <span className="text-[12px] text-[#99a1af]">
                          {timeAgo(b.createdAt.toISOString())}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Demo Activity */}
        <section className="rounded-[8px] border border-[#e5e7eb] bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#101828]">Demo activity</h2>
            <LogDemoTextLink />
          </div>
          {recentDemos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarRange size={48} strokeWidth={1.5} className="text-[#e5e7eb]" />
              <p className="text-[16px] font-semibold text-[#101828]">No demos logged yet</p>
              <LogDemoTextLink label="Log your first demo →" />
            </div>
          ) : (
            <ul className="[&>li:last-child>a]:border-b-0">
              {recentDemos.map((d) => (
                <li key={d.id}>
                  <Link
                    href="/commission"
                    className="home-row home-focus flex min-h-[48px] items-center justify-between gap-3 border-b border-[#f3f4f6] px-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ChannelPill type={d.setType} />
                      <span className="truncate text-[14px] font-semibold text-[#101828]">
                        {d.prospect}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="text-[12px] text-[#99a1af]">{shortDate(new Date(d.demoDate))}</span>
                      <StatusPill status={d.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Chart card */}
      <section className="mt-5 rounded-[8px] border border-[#e5e7eb] bg-white p-5">
        <div className="mb-3">
          <h2 className="text-[18px] font-semibold text-[#101828]">Completes this month</h2>
          <p className="mt-0.5 text-[12px] text-[#6a7282]">
            {monthLabel} — {completes} of {quota} quota.
          </p>
        </div>
        <HomeChart data={chartData} quota={quota} total={completes} monthShort={monthShort} />
      </section>

      {/* Pacing banner — only when projected to miss quota */}
      {quota > 0 && projection < quota && (
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-[#eb7360] px-4 py-3"
          style={{ background: "#fef0ee" }}
        >
          <AlertTriangle size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#eb7360]" />
          <p className="text-[14px] text-[#505050]">
            You&apos;re projected to hit{" "}
            <span className="font-semibold text-[#101828]">{Math.round(projection)}</span> completes
            vs quota <span className="font-semibold text-[#101828]">{quota}</span>. You need{" "}
            {needMore} more.{" "}
            <Link href="/pacing" className="home-focus font-medium text-[#eb7360]">
              Open pacing calculator →
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
