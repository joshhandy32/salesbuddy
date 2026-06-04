import Link from "next/link";
import type { Metadata } from "next";
import {
  FileText,
  CalendarCheck2,
  Gauge,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { briefDisplayTitle } from "@/lib/briefTitle";
import HomeChart from "./components/HomeChart";
import LogDemoButton from "./components/LogDemoButton";

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

function briefActivity(b: {
  company: string | null;
  result: string;
  flagged: boolean;
}): { title: string; failed: boolean } {
  if (b.company && b.company.trim()) return { title: b.company.trim(), failed: false };
  let summary: string | undefined;
  try {
    summary = JSON.parse(b.result)?.aeBrief?.dealSummary;
  } catch {
    summary = undefined;
  }
  return briefDisplayTitle(summary, b.flagged);
}

export default async function Home() {
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [profile, recentBriefs, recentDemos, demosThisMonth, briefsThisWeek, totalBriefs, totalDemos] =
    await Promise.all([
      prisma.userProfile.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
      prisma.brief.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true, company: true, result: true, flagged: true },
      }),
      prisma.demoSet.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.demoSet.findMany({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
      prisma.brief.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.brief.count(),
      prisma.demoSet.count(),
    ]);

  // Stats
  const completes = demosThisMonth.filter((d) => isComplete(d.status)).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const projection = daysElapsed > 0 ? (completes / daysElapsed) * daysInMonth : 0;
  const onPace = completes > 0 && projection >= profile.quota;
  const closedWon = demosThisMonth.filter((d) => d.status === "CLOSED_WON");
  const revenue = closedWon.reduce((s, d) => s + (d.dealRevenue ?? 0), 0);
  const commissionMTD =
    profile.commissionModel === "percent"
      ? revenue * (profile.commissionRate / 100)
      : closedWon.length * profile.flatBonus;

  // Weekly completes (current month)
  const weekOf = (day: number) => (day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3);
  const weekly = [0, 1, 2, 3].map(
    (w) =>
      demosThisMonth.filter((d) => isComplete(d.status) && weekOf(new Date(d.createdAt).getDate()) === w)
        .length,
  );

  // Activity feed
  const activity = [
    ...recentDemos.map((d) => ({
      kind: "demo" as const,
      at: d.createdAt.toISOString(),
      label: d.prospect,
      sub: `${d.setType} demo · ${d.status.replace("_", " ")}`,
      href: "/commission",
      failed: false,
    })),
    ...recentBriefs.map((b) => {
      const { title, failed } = briefActivity(b);
      return {
        kind: "brief" as const,
        at: b.createdAt.toISOString(),
        label: title,
        sub: "Brief generated",
        href: `/history/${b.id}`,
        failed,
      };
    }),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const greeting = `Good ${partOfDay}${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}`;

  const stats = [
    { icon: FileText, label: "Briefs this week", value: String(briefsThisWeek) },
    { icon: CalendarCheck2, label: "Demos this month", value: String(totalDemos === 0 ? 0 : demosThisMonth.length) },
    {
      icon: Gauge,
      label: "Pacing",
      value: completes === 0 ? "—" : onPace ? "On pace" : "Behind",
      tone: completes === 0 ? "default" : onPace ? "teal" : "coral",
    },
    { icon: DollarSign, label: "Commission MTD", value: money(commissionMTD) },
  ] as const;

  const isNew = totalBriefs === 0 && totalDemos === 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Greeting */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink">{greeting}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} ·
            Here&apos;s your day at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/brief" className="btn-primary">
            <Sparkles size={15} /> Generate a brief
          </Link>
          <LogDemoButton />
        </div>
      </header>

      {isNew ? (
        <WelcomeCard />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.icon;
              const tone =
                "tone" in s && s.tone === "teal"
                  ? "text-teal-ink"
                  : "tone" in s && s.tone === "coral"
                    ? "text-coral-dark"
                    : "text-ink";
              return (
                <div
                  key={s.label}
                  className="card animate-fade-up p-4"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Icon size={15} strokeWidth={1.8} />
                    <span className="label-caps">{s.label}</span>
                  </div>
                  <div className={`text-[22px] font-bold leading-none ${tone}`}>{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Activity + chart */}
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <section className="card animate-fade-up p-5 lg:col-span-3" style={{ animationDelay: "120ms" }}>
              <h2 className="mb-4 text-[15px] font-semibold text-ink">Recent activity</h2>
              {activity.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted">Nothing logged yet.</p>
              ) : (
                <ul className="-my-1 divide-y divide-line/60">
                  {activity.map((a, i) => (
                    <li key={i}>
                      <Link
                        href={a.href}
                        className="hover-lift group flex items-center gap-3 rounded-input px-2 py-2.5 transition-colors hover:bg-page"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            a.kind === "brief" ? "bg-coral-bg text-coral" : "bg-page text-body"
                          }`}
                        >
                          {a.kind === "brief" ? <FileText size={15} /> : <CalendarCheck2 size={15} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {a.failed && (
                              <span
                                title="AI extraction failed — try regenerating."
                                className="shrink-0 text-coral"
                              >
                                <AlertTriangle size={12} />
                              </span>
                            )}
                            <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                              {a.label}
                            </span>
                          </span>
                          <span className="block truncate text-[11.5px] text-muted">{a.sub}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{timeAgo(a.at)}</span>
                        <ArrowUpRight
                          size={14}
                          className="shrink-0 text-line transition-colors group-hover:text-coral"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card animate-fade-up p-5 lg:col-span-2" style={{ animationDelay: "180ms" }}>
              <h2 className="mb-1 text-[15px] font-semibold text-ink">Completes this month</h2>
              <p className="mb-3 text-[12px] text-muted">Qualified completes per week.</p>
              <HomeChart weekly={weekly} />
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function WelcomeCard() {
  const tools = [
    { icon: Sparkles, title: "Brief Engine", desc: "Turn a call into an AE brief + coaching note.", href: "/brief" },
    { icon: ClipboardList, title: "Coaching Digest", desc: "Per-rep coaching priorities from your briefs.", href: "/digest" },
    { icon: BarChart3, title: "Pacing Calculator", desc: "Model what you need to hit your number.", href: "/pacing" },
    { icon: DollarSign, title: "Commission Tracker", desc: "Track commission, recaps, and approvals.", href: "/commission" },
  ];
  return (
    <div className="card animate-fade-up p-8">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={20} className="text-coral" />
        <h2 className="text-[17px] font-bold text-ink">Welcome to SalesBuddy</h2>
      </div>
      <p className="mb-6 max-w-lg text-[13px] text-muted">
        Your all-in-one assistant. Start by generating a brief from a call, then log your demo sets — the
        pacing and commission tools fill in as you go.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.title}
              href={t.href}
              className="group flex items-start gap-3 rounded-input border border-line p-4 transition-colors hover:border-coral/30 hover:bg-coral-bg/30"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-bg text-coral">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[14px] font-semibold text-ink">
                  {t.title}
                  <ArrowRight size={13} className="text-line transition-colors group-hover:text-coral" />
                </span>
                <span className="block text-[12px] text-muted">{t.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 flex gap-2">
        <Link href="/brief" className="btn-primary">
          <Sparkles size={15} /> Generate your first brief
        </Link>
        <Link href="/settings" className="btn-secondary">
          <SettingsIcon size={15} /> Set up your profile
        </Link>
      </div>
    </div>
  );
}
