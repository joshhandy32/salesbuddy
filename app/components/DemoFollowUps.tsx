"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export type FollowUpDemo = {
  id: string;
  prospect: string;
  setType: string;
  status: string;
  demoDate: string; // ISO
};

// Status choices for resolving a past-due demo. These are the outcomes a rep
// picks once the scheduled date has passed; SET is omitted since "still set but
// overdue" is exactly the state we're nudging them out of.
const RESOLVE_OPTIONS = [
  "SHOWED",
  "COMPLETED",
  "NO_SHOW",
  "RESCHEDULED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "RELIEF",
];

// Statuses that mean the demo no longer needs attention (drops off the list).
const RESOLVED = new Set([
  "NO_SHOW",
  "COMPLETED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "RELIEF",
]);

function overdueLabel(iso: string): string {
  // Demo dates are UTC-midnight calendar days; read them in UTC and compare to
  // today's local calendar date (matching the server-side past-due threshold).
  const day = new Date(iso);
  const today = new Date();
  const d0 = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((t0 - d0) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export default function DemoFollowUps({ initial }: { initial: FollowUpDemo[] }) {
  const [demos, setDemos] = useState<FollowUpDemo[]>(initial);
  const router = useRouter();

  if (demos.length === 0) return null;

  async function resolve(id: string, status: string) {
    // Optimistically drop it from the list when the new status resolves it.
    if (RESOLVED.has(status)) {
      setDemos((list) => list.filter((d) => d.id !== id));
    } else {
      setDemos((list) => list.map((d) => (d.id === id ? { ...d, status } : d)));
    }
    await fetch(`/api/demos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    router.refresh(); // refresh server-rendered pacing / commission counts
  }

  return (
    <section
      className="rounded-[8px] border px-5 py-4"
      style={{ borderColor: "#f3d9c4", background: "#fffaf5" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} strokeWidth={2.2} style={{ color: "#b45309" }} />
        <h2 className="text-[15px] font-semibold text-[#101828]">
          Needs attention
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: "#fef3c7", color: "#b45309" }}
        >
          {demos.length}
        </span>
      </div>
      <p className="mb-3 text-[12px] text-[#6a7282]">
        These demos are past their date but still open. Set an outcome to keep
        your pacing, commission, and ICP numbers accurate.
      </p>
      <ul className="divide-y divide-[#f3e6d6]">
        {demos.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span
              className="shrink-0 rounded-[6px] border px-2 py-0.5 text-[12px] font-semibold"
              style={{ background: "#fff7ed", color: "#eb7360", borderColor: "#f3d9c4" }}
            >
              {d.setType}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#101828]">
              {d.prospect}
            </span>
            <span className="shrink-0 text-[12px] text-[#99a1af]">
              {d.status === "SHOWED" ? "showed · " : ""}
              {overdueLabel(d.demoDate)}
            </span>
            <select
              className="field !h-8 w-36 shrink-0 !py-0 text-[12px]"
              value=""
              onChange={(e) => e.target.value && resolve(d.id, e.target.value)}
            >
              <option value="" disabled>
                Set outcome…
              </option>
              {RESOLVE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
