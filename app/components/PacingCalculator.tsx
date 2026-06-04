"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import {
  type Historical,
  type PlayInputs,
  aggregate,
  ratesFrom,
  project,
  totalSets,
  RATE_DEFS,
  pct2,
  num1,
  monthLabel,
} from "@/lib/pacingMath";
import { TIERS } from "@/lib/profile";

type Weekly = { demoSets: number; completes: number };

const TABS = ["Overview", "Monthly Pacing", "Weekly Pacing", "Promotion Path", "Quotas & Tiers"] as const;
type Tab = (typeof TABS)[number];

const CORAL = "#eb7360";
const TEAL = "#5bc4a8";
const LINE = "#e8e4e0";

// Editable numeric cell for the historicals table.
function NumCell({
  value,
  onCommit,
  money,
}: {
  value: number;
  onCommit: (v: number) => void;
  money?: boolean;
}) {
  const [v, setV] = useState(String(value));
  return (
    <input
      className="field !h-8 w-20 !px-2 !py-0 text-[12px]"
      type="number"
      min={0}
      step={money ? 100 : 1}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(Number(v) || 0)}
    />
  );
}

function InfoIcon({ tip }: { tip: string }) {
  return (
    <span
      title={tip}
      className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-line text-[9px] text-muted"
    >
      i
    </span>
  );
}

export default function PacingCalculator({
  historicals,
  currentMonth,
  quota,
  tier,
  workingDays,
  weekly,
}: {
  historicals: Historical[];
  currentMonth: string;
  quota: number;
  tier: string;
  workingDays: number;
  weekly: Weekly[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [rows, setRows] = useState<Historical[]>(historicals);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [tierQuota, setTierQuota] = useState(quota);

  // ── Historical edits ──
  async function patchH(id: string, field: keyof Historical, value: number) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await fetch(`/api/historicals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {});
    router.refresh();
  }
  async function addMonth() {
    const months = rows.map((r) => r.month);
    // suggest the month before the earliest existing
    const earliest = months.sort()[0] ?? currentMonth;
    const [y, m] = earliest.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch("/api/historicals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: key }),
    });
    if (res.ok) {
      const row = (await res.json()) as Historical;
      setRows((rs) => [...rs, row].sort((a, b) => b.month.localeCompare(a.month)));
      router.refresh();
    }
  }

  // ── Derived ──
  const totals = aggregate(rows);
  const avgRates = ratesFrom(totals);
  const monthCount = Math.max(1, rows.length);
  const baseDialsPerDay = workingDays > 0 ? Math.round(totals.dials / monthCount / workingDays) : 0;

  const baseInputs: PlayInputs = {
    workingDays,
    dialsPerDay: baseDialsPerDay || 50,
    connectRate: avgRates.connectRate || 0.3,
    conversationRate: avgRates.conversationRate || 0.4,
    demoSetRate: avgRates.demoSetRate || 0.1,
    showRate: avgRates.showRate || 0.6,
    completeRate: avgRates.completeRate || 0.5,
    closeRate: avgRates.closeRate || 0.15,
  };
  const [inputs, setInputs] = useState<PlayInputs>(baseInputs);
  const out = project(inputs);
  const onPace = out.monthlyCompletes >= quota;

  const setInput = (k: keyof PlayInputs, v: number) => setInputs((i) => ({ ...i, [k]: v }));

  const current = rows.find((r) => r.month === currentMonth);

  return (
    <div>
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pacing Calculator</h1>
          <p className="mt-1 text-[13px] text-muted">
            Track your historical performance and calculate what you need to hit your goals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="field !h-9 w-44 !py-0"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {rows.map((r) => (
              <option key={r.month} value={r.month}>
                {monthLabel(r.month)}
                {r.month === currentMonth ? " (current)" : ""}
              </option>
            ))}
          </select>
          <button
            className="btn-secondary cursor-not-allowed opacity-60"
            disabled
            title="Coming soon — automatic sync from HubSpot"
          >
            Sync from HubSpot
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
              tab === t
                ? "border-coral text-ink"
                : "border-transparent text-muted hover:text-body"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-6">
          {/* Section A — Historicals */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">Historicals</h2>
              <button className="btn-secondary" onClick={addMonth}>
                + Add month
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    {[
                      "Month",
                      "Dials",
                      "Connects",
                      "Conversations",
                      "Orum Sets",
                      "Other Sets",
                      "Total Sets",
                      "Shows",
                      "Completes",
                      "Closed",
                      "Revenue",
                      "Reliefs",
                    ].map((h) => (
                      <th key={h} className="label-caps whitespace-nowrap py-2 pr-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line/60">
                      <td className="whitespace-nowrap py-1.5 pr-2 font-medium text-ink">
                        {monthLabel(r.month)}
                      </td>
                      {(
                        [
                          "dials",
                          "connects",
                          "conversations",
                          "orumDemoSets",
                          "otherDemoSets",
                        ] as (keyof Historical)[]
                      ).map((f) => (
                        <td key={f} className="py-1.5 pr-2">
                          <NumCell value={r[f] as number} onCommit={(v) => patchH(r.id, f, v)} />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2 font-semibold text-ink">{totalSets(r)}</td>
                      {(
                        ["demoShows", "demoCompletes", "closedDeals"] as (keyof Historical)[]
                      ).map((f) => (
                        <td key={f} className="py-1.5 pr-2">
                          <NumCell value={r[f] as number} onCommit={(v) => patchH(r.id, f, v)} />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2">
                        <NumCell value={r.revenue} money onCommit={(v) => patchH(r.id, "revenue", v)} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <NumCell value={r.reliefs} onCommit={(v) => patchH(r.id, "reliefs", v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section B — Conversion rates */}
          <section className="card p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-ink">Conversion rates</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="label-caps py-2 pr-3 font-semibold">Rate</th>
                    {rows.map((r) => (
                      <th key={r.month} className="label-caps whitespace-nowrap py-2 pr-3 font-semibold">
                        {monthLabel(r.month).split(" ")[0]}
                      </th>
                    ))}
                    <th className="label-caps py-2 pr-3 font-semibold">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_DEFS.map((def) => {
                    const avg = avgRates[def.key];
                    const fmt = (v: number) => (def.isPct ? pct2(v) : num1(v));
                    const color =
                      def.benchmark == null
                        ? "text-ink"
                        : avg >= def.benchmark
                          ? "text-teal-ink"
                          : "text-coral-dark";
                    return (
                      <tr key={def.key} className="border-b border-line/60">
                        <td className="whitespace-nowrap py-1.5 pr-3 text-body">
                          {def.label}
                          <InfoIcon tip={def.formula} />
                        </td>
                        {rows.map((r) => {
                          const mr = ratesFrom(aggregate([r]));
                          return (
                            <td key={r.month} className="py-1.5 pr-3 text-muted">
                              {fmt(mr[def.key])}
                            </td>
                          );
                        })}
                        <td className={`py-1.5 pr-3 font-semibold ${color}`}>{fmt(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section C — Play calculator */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inputs */}
            <section className="card bg-coral-bg/40 p-5">
              <h2 className="mb-1 text-[15px] font-semibold text-ink">Monthly inputs</h2>
              <p className="mb-4 text-[12px] text-muted">Pre-filled from your historical average. Tweak to model a plan.</p>
              <div className="space-y-3">
                <PlayInput label="Working days" help="Selling days this month." value={inputs.workingDays} step={1} onChange={(v) => setInput("workingDays", v)} />
                <PlayInput label="Dials per day" help="Outbound dials you make each working day." value={inputs.dialsPerDay} step={1} onChange={(v) => setInput("dialsPerDay", v)} />
                <PctInput label="Connect rate" help="Share of dials that reach a person." value={inputs.connectRate} onChange={(v) => setInput("connectRate", v)} />
                <PctInput label="Conversation rate" help="Share of connects that become conversations." value={inputs.conversationRate} onChange={(v) => setInput("conversationRate", v)} />
                <PctInput label="Demo set rate" help="Share of conversations that book a demo." value={inputs.demoSetRate} onChange={(v) => setInput("demoSetRate", v)} />
                <PctInput label="Show rate" help="Share of booked demos that show up." value={inputs.showRate} onChange={(v) => setInput("showRate", v)} />
                <PctInput label="Complete rate" help="Share of shows that complete (qualified)." value={inputs.completeRate} onChange={(v) => setInput("completeRate", v)} />
                <PctInput label="Close rate" help="Share of completes that close." value={inputs.closeRate} onChange={(v) => setInput("closeRate", v)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setInput("dialsPerDay", Math.round(baseInputs.dialsPerDay * 1.1))}>Dial 10% more</button>
                <button className="btn-secondary" onClick={() => setInput("dialsPerDay", Math.round(baseInputs.dialsPerDay * 1.2))}>Dial 20% more</button>
                <button className="btn-secondary" onClick={() => setInput("workingDays", baseInputs.workingDays + 2)}>Working +2 days</button>
                <button className="btn-secondary" onClick={() => setInputs(baseInputs)}>Clear scenario</button>
              </div>
            </section>

            {/* Outputs */}
            <section className="card p-5">
              <h2 className="mb-4 text-[15px] font-semibold text-ink">Projected output</h2>
              <div className="grid grid-cols-2 gap-3">
                <Out label="Daily connects" value={num1(out.dailyConnects)} />
                <Out label="Daily conversations" value={num1(out.dailyConversations)} />
                <Out label="Daily demo sets" value={num1(out.dailyDemoSets)} />
                <Out label="Daily shows" value={num1(out.dailyShows)} />
                <Out label="Daily completes" value={num1(out.dailyCompletes)} />
                <Out label="Monthly completes" value={num1(out.monthlyCompletes)} highlight />
                <Out label="Monthly closed deals" value={num1(out.monthlyClosedDeals)} />
              </div>
              <div className="mt-4 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Projected", v: out.monthlyCompletes }, { name: "Quota", v: quota }]}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8d8a86" }} axisLine={{ stroke: LINE }} tickLine={false} />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      <Cell fill={onPace ? TEAL : CORAL} />
                      <Cell fill="#d1cec9" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Pacing banner */}
          <div
            className={`rounded-input px-4 py-3 text-[14px] font-medium ${
              onPace ? "bg-teal/10 text-teal-ink" : "bg-coral-bg text-coral-dark"
            }`}
          >
            {onPace
              ? `On pace — projected ${num1(out.monthlyCompletes)} completes vs quota ${quota}.`
              : `Not on pace — projected ${num1(out.monthlyCompletes)} completes vs quota ${quota}. Gap: ${num1(quota - out.monthlyCompletes)}.`}
          </div>
        </div>
      )}

      {tab === "Monthly Pacing" && (
        <MonthlyPacing
          out={out}
          inputs={inputs}
          monthRow={rows.find((r) => r.month === selectedMonth)}
        />
      )}

      {tab === "Weekly Pacing" && <WeeklyPacing out={out} inputs={inputs} weekly={weekly} />}

      {tab === "Promotion Path" && <PromotionPath tier={tier} current={current} />}

      {tab === "Quotas & Tiers" && (
        <QuotasTiers
          tier={tier}
          tierQuota={tierQuota}
          onTierQuota={(v) => {
            setTierQuota(v);
            fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quota: v }),
            }).then(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

// ── Small UI atoms ───────────────────────────────────────────────────────
function PlayInput({ label, help, value, step, onChange }: { label: string; help: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <input type="number" min={0} step={step} className="field !h-8 mt-1 !py-0 text-[13px]" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      <span className="mt-0.5 block text-[10.5px] text-muted">{help}</span>
    </label>
  );
}
function PctInput({ label, help, value, onChange }: { label: string; help: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <div className="relative mt-1">
        <input type="number" min={0} step={0.5} className="field !h-8 !py-0 text-[13px]" value={Math.round(value * 1000) / 10} onChange={(e) => onChange((Number(e.target.value) || 0) / 100)} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">%</span>
      </div>
      <span className="mt-0.5 block text-[10.5px] text-muted">{help}</span>
    </label>
  );
}
function Out({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-input border px-3.5 py-3 ${highlight ? "border-coral/30 bg-coral-bg" : "border-line bg-page/50"}`}>
      <div className="label-caps mb-1">{label}</div>
      <div className={`text-[20px] font-bold leading-none ${highlight ? "text-coral-dark" : "text-ink"}`}>{value}</div>
    </div>
  );
}

// ── Tab 2 ──
function MonthlyPacing({ out, inputs, monthRow }: { out: ReturnType<typeof project>; inputs: PlayInputs; monthRow?: Historical }) {
  const dialsGoal = inputs.dialsPerDay * inputs.workingDays;
  const conversationsGoal = out.dailyConversations * inputs.workingDays;
  const setsGoal = out.dailyDemoSets * inputs.workingDays;
  const rowsDef = [
    { label: "Dials", goal: dialsGoal, actual: monthRow?.dials ?? 0 },
    { label: "Conversations", goal: conversationsGoal, actual: monthRow?.conversations ?? 0 },
    { label: "Demo Sets", goal: setsGoal, actual: monthRow ? totalSets(monthRow) : 0 },
    { label: "Completes", goal: out.monthlyCompletes, actual: monthRow?.demoCompletes ?? 0 },
    { label: "Closed Deals", goal: out.monthlyClosedDeals, actual: monthRow?.closedDeals ?? 0 },
  ];
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Monthly pacing</h2>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="label-caps py-2 pr-3 font-semibold">Metric</th>
            <th className="label-caps py-2 pr-3 font-semibold">Goal</th>
            <th className="label-caps py-2 pr-3 font-semibold">Pacing (actual)</th>
            <th className="label-caps py-2 pr-3 font-semibold">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rowsDef.map((r) => {
            const gap = r.actual - r.goal;
            return (
              <tr key={r.label} className="border-b border-line/60">
                <td className="py-2 pr-3 font-medium text-ink">{r.label}</td>
                <td className="py-2 pr-3 text-body">{num1(r.goal)}</td>
                <td className="py-2 pr-3 text-body">{num1(r.actual)}</td>
                <td className={`py-2 pr-3 font-semibold ${gap >= 0 ? "text-teal-ink" : "text-coral-dark"}`}>
                  {gap >= 0 ? "+" : ""}
                  {num1(gap)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ── Tab 3 ──
function WeeklyPacing({ out, inputs, weekly }: { out: ReturnType<typeof project>; inputs: PlayInputs; weekly: Weekly[] }) {
  const goals = {
    Dials: (inputs.dialsPerDay * inputs.workingDays) / 4,
    Conversations: (out.dailyConversations * inputs.workingDays) / 4,
    "Demo Sets": (out.dailyDemoSets * inputs.workingDays) / 4,
    Completes: out.monthlyCompletes / 4,
  };
  const actualFor = (metric: string, w: number): number | null => {
    if (metric === "Demo Sets") return weekly[w]?.demoSets ?? 0;
    if (metric === "Completes") return weekly[w]?.completes ?? 0;
    return null; // Dials/Conversations have no per-week source yet
  };
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-ink">Weekly pacing</h2>
      <p className="mb-4 text-[12px] text-muted">Goals are the monthly goal ÷ 4. Demo-set and complete actuals come from logged demos this month.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="label-caps py-2 pr-3 font-semibold">Metric</th>
              {[0, 1, 2, 3].map((w) => (
                <th key={w} className="label-caps py-2 pr-3 font-semibold">WK{w + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(goals).map(([metric, goal]) => (
              <tr key={metric} className="border-b border-line/60 align-top">
                <td className="py-2 pr-3 font-medium text-ink">{metric}</td>
                {[0, 1, 2, 3].map((w) => {
                  const actual = actualFor(metric, w);
                  const onPace = actual != null && actual >= goal;
                  return (
                    <td key={w} className="py-2 pr-3">
                      <div className="text-muted">Goal {num1(goal)}</div>
                      <div className="text-ink">Actual {actual == null ? "—" : num1(actual)}</div>
                      <div className={onPace ? "text-teal-ink" : actual == null ? "text-muted" : "text-coral-dark"}>
                        {actual == null ? "n/a" : onPace ? "Yes" : "No"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Tab 4 ──
function PromotionPath({ tier, current }: { tier: string; current?: Historical }) {
  const idx = TIERS.findIndex((t) => t.tier === tier);
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  const completes = current?.demoCompletes ?? 0;

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Promotion path</h2>
      {!next ? (
        <p className="text-[13px] text-muted">You&apos;re at the top tier — no further promotion target.</p>
      ) : (
        (() => {
          const target = next.quota * 1.3;
          const progress = Math.min(1, target > 0 ? completes / target : 0);
          const hit = completes >= target;
          return (
            <div>
              <p className="mb-3 text-[14px] text-ink">
                <span className="font-semibold">{next.tier} target:</span> 130% of {next.tier} quota ({next.quota}) ={" "}
                <span className="font-semibold">{num1(target)} completes/month</span> for 3 consecutive months.
              </p>
              <div className="mb-2 flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${hit ? "bg-teal" : "bg-coral"}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className={`text-[13px] font-semibold ${hit ? "text-teal-ink" : "text-coral-dark"}`}>
                  {hit ? "✓" : "✗"} {completes}/{num1(target)}
                </span>
              </div>
              <p className="text-[12px] text-muted">
                This month: {completes} completes against a {num1(target)} target.
                {hit ? " On track for this month." : ` ${num1(target - completes)} more needed this month.`}
              </p>
            </div>
          );
        })()
      )}
    </section>
  );
}

// ── Tab 5 ──
function QuotasTiers({ tier, tierQuota, onTierQuota }: { tier: string; tierQuota: number; onTierQuota: (v: number) => void }) {
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-ink">Quotas &amp; tiers</h2>
      <p className="mb-4 text-[12px] text-muted">Your current tier is outlined. Edit your tier&apos;s quota to update Settings.</p>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="label-caps py-2 pr-3 font-semibold">Tier</th>
            <th className="label-caps py-2 pr-3 font-semibold">Monthly quota</th>
            <th className="label-caps py-2 pr-3 font-semibold">Weekly target</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => {
            const isCurrent = t.tier === tier;
            const q = isCurrent ? tierQuota : t.quota;
            return (
              <tr
                key={t.tier}
                className={`border-b border-line/60 ${isCurrent ? "outline outline-1 outline-coral/40" : ""}`}
              >
                <td className="py-2 pr-3 font-medium text-ink">
                  {t.tier}
                  {isCurrent && <span className="pill pill-coral ml-2">You</span>}
                </td>
                <td className="py-2 pr-3">
                  {isCurrent ? (
                    <input
                      type="number"
                      min={0}
                      className="field !h-8 w-20 !py-0 text-[12px]"
                      value={q}
                      onChange={(e) => onTierQuota(Number(e.target.value) || 0)}
                    />
                  ) : (
                    <span className="text-body">{q}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-body">{num1(q / 4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
