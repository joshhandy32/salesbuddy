"use client";

import { useState } from "react";
import {
  computePacing,
  computePlay,
  computeCommission,
  pct,
  money,
  round1,
  type CommissionModel,
  type PacingMonth,
  type PacingSettings,
} from "@/lib/pacing";

const num = (s: string) => {
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
};

// Above this, a completes value is almost certainly a typo.
const COMPLETES_CEILING = 1000;

function monthLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Small presentational helpers ─────────────────────────────────────────────
function Stat({
  label,
  value,
  breakdown,
  tone = "default",
}: {
  label: string;
  value: string;
  breakdown?: string;
  tone?: "default" | "teal" | "coral";
}) {
  const color =
    tone === "teal"
      ? "text-teal-ink"
      : tone === "coral"
        ? "text-coral-dark"
        : "text-ink";
  return (
    <div className="rounded-input border border-line bg-page/50 px-3.5 py-3">
      <div className="label-caps mb-1">{label}</div>
      <div className={`text-[20px] font-bold leading-none ${color}`}>{value}</div>
      {breakdown && <div className="mt-1.5 text-[11px] leading-snug text-muted">{breakdown}</div>}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          className="field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-btn bg-coral text-[12px] font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="text-[12px] text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Main tool ────────────────────────────────────────────────────────────────
export default function PacingTool({
  initialSettings,
  initialMonths,
  today,
}: {
  initialSettings: PacingSettings;
  initialMonths: PacingMonth[];
  today: string;
}) {
  const [settings, setSettings] = useState<PacingSettings>(initialSettings);
  const [months, setMonths] = useState<PacingMonth[]>(initialMonths);

  // Current-month working inputs (ephemeral).
  const [dateStr, setDateStr] = useState(today);
  const [sets, setSets] = useState("12");
  const [shows, setShows] = useState("9");
  const [completes, setCompletes] = useState("5");

  // What-if rate overrides for the play calculator.
  const [customRates, setCustomRates] = useState(false);
  const [wiSetShow, setWiSetShow] = useState("75");
  const [wiShowComplete, setWiShowComplete] = useState("60");

  // Commission inputs.
  const [revenue, setRevenue] = useState("50000");
  const [deals, setDeals] = useState("5");

  // Persist settings (fire-and-forget) and keep local state in sync.
  function patchSettings(partial: Partial<PacingSettings>) {
    setSettings((s) => ({ ...s, ...partial }));
    fetch("/api/pacing/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    }).catch(() => {});
  }

  // ── Time pacing from the chosen date ──
  const d = new Date(dateStr + "T00:00:00");
  const valid = !isNaN(d.getTime());
  const daysInMonth = valid
    ? new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    : 30;
  const daysElapsed = valid ? d.getDate() : 1;

  const nSets = num(sets);
  const nShows = num(shows);
  const nCompletes = num(completes);

  const pacing = computePacing({
    quota: settings.quota,
    sets: nSets,
    shows: nShows,
    completes: nCompletes,
    daysElapsed,
    daysInMonth,
  });

  // ── Play (back-solve) ──
  const playSetShow = customRates ? num(wiSetShow) / 100 : pacing.setShowRate;
  const playShowComplete = customRates
    ? num(wiShowComplete) / 100
    : pacing.showCompleteRate;
  const play = computePlay(pacing.completesToQuota, playSetShow, playShowComplete);
  const ratesUsable = playSetShow > 0 && playShowComplete > 0;

  function toggleCustomRates() {
    setCustomRates((c) => {
      const next = !c;
      if (next) {
        // Seed the override fields with the rep's actual rates.
        setWiSetShow(String(Math.round(pacing.setShowRate * 100)));
        setWiShowComplete(String(Math.round(pacing.showCompleteRate * 100)));
      }
      return next;
    });
  }

  // ── Commission ──
  const commission = computeCommission({
    model: settings.commissionModel,
    rate: settings.commissionRate,
    flatBonus: settings.flatBonus,
    revenue: num(revenue),
    deals: num(deals),
    runRateMultiple: pacing.runRateMultiple,
  });

  // ── Historicals add-row ──
  const [nm, setNm] = useState({
    month: "",
    sets: "",
    shows: "",
    completes: "",
    quota: "",
  });
  const [adding, setAdding] = useState(false);

  function fillFromCurrent() {
    setNm({
      month: monthLabel(dateStr),
      sets,
      shows,
      completes,
      quota: String(settings.quota),
    });
  }

  async function addMonth() {
    if (!nm.month.trim()) return;
    setAdding(true);
    const res = await fetch("/api/pacing/months", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: nm.month,
        sets: num(nm.sets),
        shows: num(nm.shows),
        completes: num(nm.completes),
        quota: num(nm.quota) || settings.quota,
      }),
    });
    if (res.ok) {
      const row = (await res.json()) as PacingMonth;
      setMonths((m) => [row, ...m]);
      setNm({ month: "", sets: "", shows: "", completes: "", quota: "" });
    }
    setAdding(false);
  }

  async function deleteMonth(id: string) {
    setMonths((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/pacing/months/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const aheadBehind = pacing.delta >= 0 ? "ahead" : "behind";
  const attainmentClamped = Math.min(pacing.attainment, 1) * 100;
  const expectedPct =
    settings.quota > 0 ? Math.min(pacing.expectedToDate / settings.quota, 1) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── Quota + date row ── */}
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <NumField
            label="Monthly quota (completes / SQOs)"
            value={String(settings.quota)}
            onChange={(v) => patchSettings({ quota: Math.max(0, Math.round(num(v))) })}
          />
          {settings.quota < 1 && (
            <p className="mt-1 text-[11px] text-coral-dark">Quota must be at least 1.</p>
          )}
        </div>
        <label className="block">
          <span className="label-caps mb-1.5 block">Today (within the month)</span>
          <input
            type="date"
            className="field"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </label>
        <div className="flex flex-col justify-end">
          <span className="label-caps mb-1.5 block">Time elapsed</span>
          <div className="text-[13px] text-body">
            Day <span className="font-semibold text-ink">{daysElapsed}</span> of{" "}
            <span className="font-semibold text-ink">{daysInMonth}</span>{" "}
            <span className="text-muted">({pct(daysElapsed / daysInMonth)} of month)</span>
          </div>
        </div>
      </div>

      {/* ── 1. Pacing Calculator ── */}
      <SectionCard
        step="1"
        title="Pacing Calculator"
        subtitle="Where you stand against quota, in completes."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label="Demos set" value={sets} onChange={setSets} />
          <NumField label="Shows" value={shows} onChange={setShows} />
          <div>
            <NumField label="Completes (SQOs)" value={completes} onChange={setCompletes} />
            {num(completes) > COMPLETES_CEILING && (
              <p className="mt-1 text-[11px] text-coral-dark">
                That looks unusually high — double-check.
              </p>
            )}
          </div>
        </div>

        {/* Status + pacing bar */}
        <div className="mt-5 rounded-input border border-line p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink">
              Run-rate projection: {round1(pacing.projection)} of {settings.quota}
            </span>
            <span className={`pill ${pacing.onPace ? "pill-teal" : "pill-coral"}`}>
              <span
                className={`h-2 w-2 rounded-full ${pacing.onPace ? "bg-teal" : "bg-coral"}`}
              />
              {pacing.onPace ? "On pace" : "Behind pace"}
            </span>
          </div>

          {/* Bar: actual fill (coral) + expected-to-date marker (ink) within full quota */}
          <div className="relative h-3 w-full rounded-full bg-line">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-coral"
              style={{ width: `${attainmentClamped}%` }}
            />
            <div
              className="absolute inset-y-[-3px] w-[2px] bg-ink"
              style={{ left: `${expectedPct}%` }}
              title="Expected to date"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-coral" /> Actual completes (
              {round1(nCompletes)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-[2px] bg-ink" /> Expected to date (
              {round1(pacing.expectedToDate)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-line" /> Quota ({settings.quota})
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Set → Show"
            value={pct(pacing.setShowRate)}
            breakdown={`${round1(nShows)} shows ÷ ${round1(nSets)} sets`}
          />
          <Stat
            label="Show → Complete"
            value={pct(pacing.showCompleteRate)}
            breakdown={`${round1(nCompletes)} completes ÷ ${round1(nShows)} shows`}
          />
          <Stat
            label="Set → Complete (overall)"
            value={pct(pacing.setCompleteRate)}
            breakdown={`${round1(nCompletes)} completes ÷ ${round1(nSets)} sets`}
          />
          <Stat
            label="Attainment"
            value={pct(pacing.attainment)}
            breakdown={`${round1(nCompletes)} completes ÷ ${settings.quota} quota`}
          />
          <Stat
            label={`Expected to date — ${aheadBehind} by ${round1(Math.abs(pacing.delta))}`}
            value={round1(pacing.expectedToDate).toString()}
            tone={pacing.delta >= 0 ? "teal" : "coral"}
            breakdown={`${settings.quota} quota × ${daysElapsed}/${daysInMonth} days = ${round1(
              pacing.expectedToDate,
            )}; you have ${round1(nCompletes)}`}
          />
          <Stat
            label="More completes to quota"
            value={round1(pacing.completesToQuota).toString()}
            breakdown={`${settings.quota} quota − ${round1(nCompletes)} completes`}
          />
        </div>
      </SectionCard>

      {/* ── 2. Play Calculator ── */}
      <SectionCard
        step="2"
        title="Play Calculator"
        subtitle="Back-solve the demos you still need to set to hit quota."
      >
        {pacing.completesToQuota === 0 ? (
          <p className="rounded-input bg-coral-bg px-4 py-3 text-[13px] font-medium text-coral-dark">
            Quota met — no more completes needed. 🎯
          </p>
        ) : !ratesUsable ? (
          <p className="rounded-input border border-line px-4 py-3 text-[13px] text-muted">
            Log some shows and completes (or override the rates below) to estimate
            the demos you need.
          </p>
        ) : (
          <p className="rounded-input bg-coral-bg px-4 py-3 text-[14px] leading-relaxed text-ink">
            You need <strong>{round1(pacing.completesToQuota)} more completes</strong>.
            At a {pct(playSetShow)} set→show rate and {pct(playShowComplete)}{" "}
            show→complete rate, that&apos;s{" "}
            <strong className="text-coral-dark">
              ~{Math.ceil(play.setsNeeded)} more demos to set
            </strong>{" "}
            (≈{Math.ceil(play.showsNeeded)} shows to hold).
          </p>
        )}

        <div className="mt-3 text-[11px] leading-relaxed text-muted">
          Breakdown: {round1(pacing.completesToQuota)} completes ÷{" "}
          {pct(playShowComplete)} show→complete = {round1(play.showsNeeded)} shows;{" "}
          {round1(play.showsNeeded)} shows ÷ {pct(playSetShow)} set→show ={" "}
          {round1(play.setsNeeded)} sets.
        </div>

        {/* What-if override */}
        <div className="mt-4 rounded-input border border-line p-4">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
            <input
              type="checkbox"
              checked={customRates}
              onChange={toggleCustomRates}
            />
            What-if: override my conversion rates
          </label>
          {customRates && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <NumField
                label="Set → Show rate"
                value={wiSetShow}
                onChange={setWiSetShow}
                suffix="%"
              />
              <NumField
                label="Show → Complete rate"
                value={wiShowComplete}
                onChange={setWiShowComplete}
                suffix="%"
              />
            </div>
          )}
          {!customRates && (
            <p className="mt-2 text-[11px] text-muted">
              Using your actual rates: {pct(pacing.setShowRate)} set→show,{" "}
              {pct(pacing.showCompleteRate)} show→complete.
            </p>
          )}
        </div>
      </SectionCard>

      {/* ── 3. Commission ── */}
      <SectionCard
        step="3"
        title="Commission"
        subtitle="What you've earned and where you'll land at this pace."
      >
        {/* Model toggle */}
        <div className="mb-4 inline-flex rounded-btn border border-line p-0.5">
          {(["percent", "flat"] as CommissionModel[]).map((m) => (
            <button
              key={m}
              onClick={() => patchSettings({ commissionModel: m })}
              className={`rounded-btn px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                settings.commissionModel === m
                  ? "bg-coral text-white"
                  : "text-body hover:bg-coral-bg/60"
              }`}
            >
              {m === "percent" ? "% of deal revenue" : "Flat bonus per deal"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {settings.commissionModel === "percent" ? (
            <>
              <NumField
                label="Commission rate"
                value={String(settings.commissionRate)}
                onChange={(v) => patchSettings({ commissionRate: num(v) })}
                suffix="%"
                step="0.1"
              />
              <NumField
                label="Closed-won revenue this month"
                value={revenue}
                onChange={setRevenue}
                suffix="$"
                step="100"
              />
            </>
          ) : (
            <>
              <NumField
                label="Flat bonus per deal"
                value={String(settings.flatBonus)}
                onChange={(v) => patchSettings({ flatBonus: num(v) })}
                suffix="$"
                step="50"
              />
              <NumField
                label="Closed deals this month"
                value={deals}
                onChange={setDeals}
              />
            </>
          )}
        </div>

        {/* Live preview line */}
        <p className="mt-3 text-[12px] text-muted">
          {settings.commissionModel === "percent"
            ? `Preview: a ${money(10000)} deal = ${money((10000 * settings.commissionRate) / 100)} commission (${settings.commissionRate}%).`
            : `Preview: each closed deal = ${money(settings.flatBonus)} commission.`}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Commission earned so far"
            value={money(commission.soFar)}
            tone="teal"
            breakdown={
              settings.commissionModel === "percent"
                ? `${money(num(revenue))} × ${settings.commissionRate}%`
                : `${round1(num(deals))} deals × ${money(settings.flatBonus)}`
            }
          />
          <Stat
            label="Projected at run-rate (EOM)"
            value={money(commission.projected)}
            breakdown={`${money(commission.soFar)} × ${round1(pacing.runRateMultiple)} run-rate (${daysInMonth}/${daysElapsed} days)`}
          />
        </div>
      </SectionCard>

      {/* ── Historicals ── */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Past months</h2>
            <p className="text-[12px] text-muted">Saved history — nothing to re-enter.</p>
          </div>
          <button className="btn-secondary" onClick={fillFromCurrent} type="button">
            Fill from current month
          </button>
        </div>

        {months.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="label-caps py-2 pr-3 font-semibold">Month</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Sets</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Shows</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Completes</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Quota</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Attainment</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const att = m.quota > 0 ? m.completes / m.quota : 0;
                  return (
                    <tr key={m.id} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{m.month}</td>
                      <td className="py-2 pr-3 text-body">{m.sets}</td>
                      <td className="py-2 pr-3 text-body">{m.shows}</td>
                      <td className="py-2 pr-3 text-body">{m.completes}</td>
                      <td className="py-2 pr-3 text-body">{m.quota}</td>
                      <td className="py-2 pr-3">
                        <span className={att >= 1 ? "text-teal-ink" : "text-coral-dark"}>
                          {pct(att)}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteMonth(m.id)}
                          className="text-[12px] text-muted hover:text-coral-dark"
                          aria-label={`Delete ${m.month}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {months.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-input border border-dashed border-line px-4 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-bg text-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-ink">No history yet</p>
            <p className="text-[12px] text-muted">
              Add your first month below to start tracking trends.
            </p>
          </div>
        )}

        {/* Add row */}
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-6">
          <label className="block sm:col-span-2">
            <span className="label-caps mb-1.5 block">Month</span>
            <input
              className="field"
              placeholder="e.g. May 2026"
              value={nm.month}
              onChange={(e) => setNm({ ...nm, month: e.target.value })}
            />
          </label>
          {(["sets", "shows", "completes", "quota"] as const).map((k) => (
            <label key={k} className="block">
              <span className="label-caps mb-1.5 block capitalize">{k}</span>
              <input
                type="number"
                min={0}
                className="field"
                value={nm[k]}
                onChange={(e) => setNm({ ...nm, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="mt-3">
          <button
            className="btn-primary"
            onClick={addMonth}
            disabled={adding || !nm.month.trim()}
            type="button"
          >
            {adding ? "Adding…" : "Add past month"}
          </button>
        </div>
      </section>
    </div>
  );
}
