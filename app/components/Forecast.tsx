"use client";

import { useEffect, useState } from "react";
import { DEAL_STAGE_LABEL, money, type ForecastMonth } from "@/lib/crm";

type ForecastDealRow = {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  accountName: string | null;
};
type Totals = { best: number; weighted: number; commit: number; won: number; noDate: number };

const monthKeyOf = (iso: string | null) => {
  if (!iso) return "none";
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default function Forecast({
  deals,
  months,
  totals,
}: {
  deals: ForecastDealRow[];
  months: ForecastMonth[];
  totals: Totals;
}) {
  // Optional personal target for a gap read; persisted locally.
  const [target, setTarget] = useState<string>("");
  // Restore the saved target after hydration (localStorage isn't available on
  // the server, so a lazy initializer would cause a hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(localStorage.getItem("sb-forecast-target") ?? "");
  }, []);
  const targetNum = Number(target) || 0;
  const gap = targetNum > 0 ? targetNum - totals.weighted : 0;

  const [openMonth, setOpenMonth] = useState<string | null>(months[0]?.key ?? null);
  const maxWeighted = Math.max(...months.map((m) => m.weighted), 1);

  if (deals.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink">No deals to forecast yet</p>
        <p className="max-w-sm text-[13px] text-muted">
          Add deals in the pipeline with amounts and close dates and your forecast builds itself.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Best case (open)" value={money(totals.best)} />
        <Stat label="Weighted forecast" value={money(totals.weighted)} accent />
        <Stat label="Commit (negotiation)" value={money(totals.commit)} />
        <Stat label="Closed won" value={money(totals.won)} />
      </div>

      {/* Target / gap */}
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="label-caps">Quarter target</span>
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-muted">$</span>
            <input
              type="number"
              min={0}
              className="field !h-8 w-32 !py-0"
              placeholder="0"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                localStorage.setItem("sb-forecast-target", e.target.value);
              }}
            />
          </div>
        </div>
        {targetNum > 0 && (
          <div className="text-[13px]">
            {gap > 0 ? (
              <span className="text-coral-dark">
                <span className="font-semibold">{money(gap)}</span> gap to target on weighted forecast
              </span>
            ) : (
              <span className="text-teal-ink">
                Weighted forecast covers target by <span className="font-semibold">{money(-gap)}</span>
              </span>
            )}
          </div>
        )}
      </section>

      {totals.noDate > 0 && (
        <p className="rounded-input border border-[#f3d9c4] bg-[#fffaf5] px-4 py-2.5 text-[13px] text-[#b45309]">
          {totals.noDate} open deal{totals.noDate === 1 ? "" : "s"} {totals.noDate === 1 ? "has" : "have"} no
          close date — add one so they land in a forecast month.
        </p>
      )}

      {/* By month */}
      <section className="card p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">By close month</h2>
        <div className="space-y-3">
          {months.map((m) => {
            const isOpen = openMonth === m.key;
            const monthDeals = deals.filter((d) => monthKeyOf(d.closeDate) === m.key);
            return (
              <div key={m.key} className="rounded-input border border-line">
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenMonth(isOpen ? null : m.key)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold text-ink">{m.label}</span>
                    <span className="text-[12px] text-muted">
                      {m.count} deal{m.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden w-40 sm:block">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-page">
                        <div
                          className="h-full rounded-full bg-coral"
                          style={{ width: `${Math.round((m.weighted / maxWeighted) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-24 text-right text-[14px] font-bold text-ink">{money(m.weighted)}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-line px-4 py-2">
                    <div className="mb-2 flex gap-4 text-[12px] text-muted">
                      <span>Best case: <span className="font-semibold text-body">{money(m.best)}</span></span>
                      <span>Commit: <span className="font-semibold text-body">{money(m.commit)}</span></span>
                    </div>
                    <ul className="divide-y divide-line/60">
                      {monthDeals.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                          <div className="min-w-0">
                            <span className="font-medium text-ink">{d.name}</span>
                            {d.accountName && <span className="text-muted"> · {d.accountName}</span>}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="pill">{DEAL_STAGE_LABEL[d.stage] ?? d.stage}</span>
                            <span className="w-20 text-right font-semibold text-ink">{money(d.amount)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="label-caps mb-1.5">{label}</div>
      <div className={`text-[22px] font-bold leading-none ${accent ? "text-coral-dark" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
