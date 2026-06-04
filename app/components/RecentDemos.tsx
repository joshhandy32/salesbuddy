"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "./EmptyState";

export type DemoRow = {
  id: string;
  createdAt: string;
  setType: string;
  prospect: string;
  status: string;
  dealRevenue: number | null;
};

const STATUS_OPTIONS = [
  "SET",
  "SHOWED",
  "NO_SHOW",
  "RESCHEDULED",
  "COMPLETED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "RELIEF",
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function RecentDemos({ initial }: { initial: DemoRow[] }) {
  const [demos, setDemos] = useState<DemoRow[]>(initial);
  const router = useRouter();

  async function patch(id: string, body: Partial<DemoRow>) {
    setDemos((list) => list.map((d) => (d.id === id ? { ...d, ...body } : d)));
    await fetch(`/api/demos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    router.refresh(); // let server-rendered counts pick up the change
  }

  if (demos.length === 0) {
    return (
      <EmptyState
        title="No demos logged yet"
        message="Log your first demo set and its status will be trackable here."
        actionLabel="Go to Brief Engine"
        actionHref="/brief"
      />
    );
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-ink">Recent demos</h2>
      <p className="mb-4 text-[12px] text-muted">
        Update a status and the pacing &amp; commission numbers follow automatically.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="label-caps py-2 pr-3 font-semibold">Date set</th>
              <th className="label-caps py-2 pr-3 font-semibold">Prospect</th>
              <th className="label-caps py-2 pr-3 font-semibold">Set type</th>
              <th className="label-caps py-2 pr-3 font-semibold">Status</th>
              <th className="label-caps py-2 pr-3 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {demos.map((d) => (
              <tr key={d.id} className="border-b border-line/60">
                <td className="whitespace-nowrap py-2 pr-3 text-body">{fmtDate(d.createdAt)}</td>
                <td className="py-2 pr-3 font-medium text-ink">{d.prospect}</td>
                <td className="py-2 pr-3 text-body">{d.setType}</td>
                <td className="py-2 pr-3">
                  <select
                    className="field !h-8 !py-0 text-[12px]"
                    value={d.status}
                    onChange={(e) => patch(d.id, { status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {d.status === "CLOSED_WON" ? (
                    <input
                      type="number"
                      min={0}
                      placeholder="$"
                      className="field !h-8 w-28 !py-0 text-[12px]"
                      value={d.dealRevenue ?? ""}
                      onChange={(e) =>
                        patch(d.id, {
                          dealRevenue: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
