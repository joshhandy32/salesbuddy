"use client";

import { useState } from "react";
import { monthLabel, money0 } from "@/lib/pacingMath";
import EmptyState from "./EmptyState";

type Metrics = {
  commissionOwed: number;
  attainment: number;
  completes: number;
  closedDeals: number;
  daysLeft: number;
  reliefs: number;
  revenue: number;
  quota: number;
};
type Recap = {
  id: string;
  month: string;
  commissionOwed: number;
  revenue: number;
  completes: number;
  closedDeals: number;
  reliefs: number;
  quota: number;
  attainment: number;
  status: string;
  managerNotes: string;
  submittedAt: string;
};

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function StatusPill({ status }: { status: string | null }) {
  if (status === "APPROVED") return <span className="pill pill-teal">Approved</span>;
  if (status === "REJECTED") return <span className="pill pill-coral">Rejected</span>;
  if (status === "PENDING")
    return <span className="pill border-[#fcd34d] bg-[#fef3c7] text-[#b45309]">Pending</span>;
  return <span className="pill">Not submitted</span>;
}

function StatCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="label-caps mb-1.5">{label}</div>
      <div className="text-[22px] font-bold leading-none text-ink">{value}</div>
      {children}
    </div>
  );
}
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input border border-line bg-page/50 px-3.5 py-3">
      <div className="label-caps mb-1">{label}</div>
      <div className="text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

export default function CommissionTracker({
  month,
  name,
  metrics,
  recaps: initialRecaps,
}: {
  month: string;
  name: string;
  metrics: Metrics;
  recaps: Recap[];
}) {
  const [recaps, setRecaps] = useState<Recap[]>(initialRecaps);
  const [sel, setSel] = useState(month);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  const view: Metrics =
    sel === month
      ? metrics
      : (() => {
          const r = recaps.find((x) => x.month === sel);
          return r
            ? {
                commissionOwed: r.commissionOwed,
                attainment: r.attainment,
                completes: r.completes,
                closedDeals: r.closedDeals,
                daysLeft: 0,
                reliefs: r.reliefs,
                revenue: r.revenue,
                quota: r.quota,
              }
            : metrics;
        })();

  const currentRecap = recaps.find((r) => r.month === sel);
  const monthOptions = Array.from(new Set([month, ...recaps.map((r) => r.month)]));

  const recapText = () =>
    [
      `Commission Recap — ${name || "Rep"} — ${monthLabel(sel)}`,
      `Quota Attainment: ${pctFmt(view.attainment)}`,
      `Outbound Completed: ${view.completes}`,
      `Quota Reliefs: ${view.reliefs}`,
      `Closed Deals: ${view.closedDeals}`,
      `Revenue: ${money0(view.revenue)}`,
      `Commission Owed: ${money0(view.commissionOwed)}`,
    ].join("\n");

  async function submitToManager() {
    setBusy(true);
    try {
      const res = await fetch("/api/recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: sel,
          commissionOwed: view.commissionOwed,
          revenue: view.revenue,
          completes: view.completes,
          closedDeals: view.closedDeals,
          reliefs: view.reliefs,
          quota: view.quota,
          attainment: view.attainment,
        }),
      });
      if (res.ok) {
        const row = (await res.json()) as Recap;
        setRecaps((rs) => [row, ...rs]);
        showToast(`Recap submitted for ${monthLabel(sel)}.`);
      } else showToast("Couldn't submit — try again.");
    } catch {
      showToast("Couldn't submit — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecap() {
    try {
      await navigator.clipboard.writeText(recapText());
      showToast("Recap copied to clipboard.");
    } catch {
      showToast("Couldn't copy — try again.");
    }
  }

  async function submitToSlack() {
    setBusy(true);
    try {
      const res = await fetch("/api/slack/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: recapText() }),
      });
      const d = await res.json();
      showToast(d.ok ? "Recap posted to Slack ✓" : "Slack delivery failed, try again.");
    } catch {
      showToast("Slack delivery failed, try again.");
    } finally {
      setBusy(false);
    }
  }

  async function patchRecap(id: string, body: Partial<Recap>) {
    setRecaps((rs) => rs.map((r) => (r.id === id ? { ...r, ...body } : r)));
    await fetch(`/api/recaps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-[22px] font-bold text-ink">Commission Tracker</h1>
        <select className="field !h-9 w-44 !py-0" value={sel} onChange={(e) => setSel(e.target.value)}>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
              {m === month ? " (current)" : ""}
            </option>
          ))}
        </select>
      </header>

      {/* Section 1 — Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Commission Owed" value={money0(view.commissionOwed)} />
        <StatCard label="Quota Attainment" value={pctFmt(view.attainment)}>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(1, view.attainment) * 100}%` }} />
          </div>
        </StatCard>
        <StatCard label="Outbound Completed" value={String(view.completes)} />
        <StatCard label="Closed Deals" value={String(view.closedDeals)} />
        <StatCard label="Days Left in Month" value={String(view.daysLeft)} />
      </div>

      {/* Section 2 — Monthly Recap */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Monthly recap — {monthLabel(sel)}</h2>
          <StatusPill status={currentRecap?.status ?? null} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Quota Attainment" value={pctFmt(view.attainment)} />
          <Tile label="Outbound Completed" value={String(view.completes)} />
          <Tile label="Quota Reliefs" value={String(view.reliefs)} />
          <Tile label="Closed Deals" value={String(view.closedDeals)} />
          <Tile label="Revenue" value={money0(view.revenue)} />
          <Tile label="Commission Owed" value={money0(view.commissionOwed)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={submitToManager} disabled={busy}>
            Submit to Manager
          </button>
          <button className="btn-secondary" onClick={copyRecap} disabled={busy}>
            Copy Recap
          </button>
          <button className="btn-secondary" onClick={submitToSlack} disabled={busy}>
            Submit to Slack
          </button>
        </div>
      </section>

      {/* Section 3 — Approval History */}
      <section className="card p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Approval history</h2>
        {recaps.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            message="Submit your first recap above and it'll appear here for approval."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="label-caps py-2 pr-3 font-semibold">Month</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Commission</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Submitted</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Status</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Manager notes</th>
                  <th className="label-caps py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recaps.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 align-middle">
                    <td className="whitespace-nowrap py-2 pr-3 font-medium text-ink">{monthLabel(r.month)}</td>
                    <td className="py-2 pr-3 text-body">{money0(r.commissionOwed)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted">{fmtDate(r.submittedAt)}</td>
                    <td className="py-2 pr-3"><StatusPill status={r.status} /></td>
                    <td className="py-2 pr-3">
                      <input
                        className="field !h-8 w-44 !py-0 text-[12px]"
                        placeholder="Add a note…"
                        defaultValue={r.managerNotes}
                        onBlur={(e) => patchRecap(r.id, { managerNotes: e.target.value })}
                      />
                    </td>
                    <td className="py-2">
                      {r.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            className="pill pill-teal cursor-pointer"
                            onClick={() => patchRecap(r.id, { status: "APPROVED" })}
                          >
                            Approve
                          </button>
                          <button
                            className="pill pill-coral cursor-pointer"
                            onClick={() => patchRecap(r.id, { status: "REJECTED" })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-[12px] text-link hover:underline"
                          onClick={() => patchRecap(r.id, { status: "PENDING" })}
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-input bg-navy px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
