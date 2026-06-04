"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { IcpAnalysis, IcpSynthesis, Segment, IcpWindow } from "@/lib/icp";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";

// Inlined (not imported from lib/icp) so this client bundle doesn't pull in the
// server-only Anthropic SDK that module also exports.
const ICP_WINDOWS: { key: IcpWindow; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];
import Spinner from "./Spinner";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Share2,
  Mail,
  Users,
  Calendar,
  Clock,
} from "lucide-react";

// ── Formatting ───────────────────────────────────────────────────────────────
const fmtPct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type DimKey = "channel" | "ae" | "day" | "time";
const DIMS: { key: DimKey; label: string; Icon: typeof Phone }[] = [
  { key: "channel", label: "Channel", Icon: Phone },
  { key: "ae", label: "AE", Icon: Users },
  { key: "day", label: "Day", Icon: Calendar },
  { key: "time", label: "Time", Icon: Clock },
];

const CHANNEL_ICON: Record<string, typeof Phone> = {
  CC: Phone,
  LinkedIn: Share2,
  Email: Mail,
};

// ── Funnel strip ─────────────────────────────────────────────────────────────
function Funnel({ o }: { o: Segment }) {
  const stages = [
    { label: "Set", n: o.set, sub: "demos booked", color: "#94a3b8" },
    { label: "Showed", n: o.showed, sub: fmtPct(o.showRate) + " of set", color: "#2b7fff" },
    { label: "Completed", n: o.completed, sub: fmtPct(o.completeRate) + " of set", color: "#00a877" },
    { label: "Won", n: o.won, sub: o.set ? fmtPct(o.won / o.set) + " of set" : "—", color: "#eb7360" },
  ];
  const max = Math.max(o.set, 1);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Conversion funnel</h2>
        <span className="text-[13px] font-semibold text-ink">
          {fmtMoney(o.revenue)} <span className="font-normal text-muted">total revenue</span>
        </span>
      </div>
      <div className="space-y-2.5">
        {stages.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-right text-[12px] font-medium text-body">
              {s.label}
            </div>
            <div className="relative h-8 flex-1 overflow-hidden rounded-[6px] bg-page">
              <div
                className="flex h-full items-center rounded-[6px] px-2.5 transition-all duration-500"
                style={{
                  width: `${Math.max((s.n / max) * 100, s.n > 0 ? 8 : 0)}%`,
                  background: s.color,
                }}
              >
                <span className="text-[12px] font-bold text-white">{s.n}</span>
              </div>
            </div>
            <div className="w-28 shrink-0 text-[11px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Segment table for one dimension ──────────────────────────────────────────
function SegmentTable({ segments, dim }: { segments: Segment[]; dim: DimKey }) {
  if (!segments.length) {
    return (
      <p className="px-1 py-8 text-center text-[13px] text-muted">
        No data for this breakdown yet.
      </p>
    );
  }
  // Highlight the strongest segment that has enough volume to trust (>=3 demos).
  const trustworthy = segments.filter((s) => s.set >= 3);
  const best = trustworthy.length
    ? trustworthy.reduce((a, b) => (b.completeRate > a.completeRate ? b : a))
    : null;
  const maxRev = Math.max(...segments.map((s) => s.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="py-2 pr-3 font-semibold text-muted">Segment</th>
            <th className="px-2 py-2 text-right font-semibold text-muted">Set</th>
            <th className="px-2 py-2 text-right font-semibold text-muted">Show</th>
            <th className="px-2 py-2 text-right font-semibold text-muted">Complete</th>
            <th className="px-2 py-2 text-right font-semibold text-muted">Win</th>
            <th className="py-2 pl-2 text-right font-semibold text-muted">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => {
            const isBest = best?.key === s.key;
            const Icon = dim === "channel" ? CHANNEL_ICON[s.key] : undefined;
            return (
              <tr
                key={s.key}
                className="border-b border-line/60 last:border-0"
                style={isBest ? { background: "var(--color-coral-bg)" } : undefined}
              >
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={14} className="shrink-0 text-muted" />}
                    <span className={`${dim === "ae" ? "rep-name " : ""}font-medium text-ink`}>
                      {s.label}
                    </span>
                    {isBest && (
                      <span className="pill pill-coral !h-[18px] !px-1.5 !text-[10px]">Best</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-body">{s.set}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-body">
                  {fmtPct(s.showRate)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-page sm:inline-block">
                      <span
                        className="block h-full rounded-full bg-success"
                        style={{ width: `${Math.round(s.completeRate * 100)}%` }}
                      />
                    </span>
                    <span className="tabular-nums font-semibold text-ink">
                      {fmtPct(s.completeRate)}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-body">
                  {fmtPct(s.winRate)}
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-page sm:inline-block">
                      <span
                        className="block h-full rounded-full bg-coral"
                        style={{ width: `${Math.round((s.revenue / maxRev) * 100)}%` }}
                      />
                    </span>
                    <span className="tabular-nums text-body">
                      {s.revenue ? fmtMoney(s.revenue) : "—"}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ c }: { c: IcpSynthesis["confidence"] }) {
  const map = {
    high: { cls: "pill-teal", label: "High confidence" },
    medium: { cls: "pill", label: "Medium confidence" },
    low: { cls: "pill-coral", label: "Low confidence — log more demos" },
  } as const;
  const { cls, label } = map[c];
  return <span className={`pill ${cls}`}>{label}</span>;
}

const DIM_BADGE: Record<string, string> = {
  Channel: "pill-teal",
  AE: "pill-coral",
  Day: "pill",
  Time: "pill",
};

// ── Main component ───────────────────────────────────────────────────────────
export default function IcpAnalyzer({
  analysis,
  window: win,
}: {
  analysis: IcpAnalysis;
  window: IcpWindow;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dim, setDim] = useState<DimKey>("channel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IcpSynthesis | null>(null);

  // Switching the window re-renders the server component with re-scoped data and
  // clears any synthesized profile (it no longer matches the new range).
  function setWindow(w: IcpWindow) {
    if (w === win) return;
    setResult(null);
    setError(null);
    router.push(w === "all" ? pathname : `${pathname}?window=${w}`);
  }

  const segmentsFor = (k: DimKey): Segment[] =>
    k === "channel"
      ? analysis.byChannel
      : k === "ae"
        ? analysis.byAE
        : k === "day"
          ? analysis.byDay
          : analysis.byTime;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJSON<IcpSynthesis>("POST", "/api/icp", { window: win }, 30000);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof TimeoutError
          ? TIMEOUT_MSG
          : err instanceof Error
            ? err.message
            : "Something went wrong building your ICP — please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Time-window selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Analyzing{" "}
          <span className="font-semibold text-ink">
            {analysis.totalDemos} demo{analysis.totalDemos === 1 ? "" : "s"}
          </span>{" "}
          {win === "all" ? "all time" : `from the ${win === "30d" ? "last 30 days" : "last 90 days"}`}.
        </p>
        <div className="inline-flex gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
          {ICP_WINDOWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setWindow(key)}
              className={`rounded-[5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                win === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {analysis.totalDemos === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-[14px] font-medium text-ink">No demos in this range</p>
          <p className="max-w-sm text-[13px] text-muted">
            Nothing was logged in the selected window. Try a wider range to see what converts.
          </p>
          <button className="btn-secondary mt-1" onClick={() => setWindow("all")}>
            Switch to all time
          </button>
        </div>
      ) : (
        <>
          <Funnel o={analysis.overall} />

          {/* AI ICP synthesis */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-coral-bg">
              <Sparkles size={16} className="text-coral" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Your Ideal Customer Profile</h2>
              <p className="text-[12px] text-muted">
                Synthesized from {analysis.totalDemos} demo{analysis.totalDemos === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="text-white" />
                Analyzing…
              </>
            ) : result ? (
              "Regenerate"
            ) : (
              <>
                <Sparkles size={15} />
                Build my ICP
              </>
            )}
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="rounded-input border border-coral/30 bg-coral-bg px-4 py-3 text-[13px] text-coral-dark">
              {error}
            </div>
          )}

          {!result && !error && (
            <p className="py-6 text-center text-[13px] text-muted">
              Click <span className="font-semibold text-body">Build my ICP</span> to turn the
              funnel below into a profile of what converts, with recommendations you can act on.
            </p>
          )}

          {result && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] leading-relaxed text-ink">{result.idealProfile}</p>
                <span className="shrink-0">
                  <ConfidenceBadge c={result.confidence} />
                </span>
              </div>

              {result.topSegments.length > 0 && (
                <div>
                  <div className="label-caps mb-2">Standout segments</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.topSegments.map((s, i) => (
                      <div key={i} className="rounded-input border border-line bg-page/50 p-3.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className={`pill ${DIM_BADGE[s.dimension] ?? "pill"}`}>
                            {s.dimension}
                          </span>
                          <span className="text-[13px] font-semibold text-ink">{s.label}</span>
                        </div>
                        <div className="mb-1 text-[13px] font-semibold text-coral-dark">
                          {s.metric}
                        </div>
                        <p className="text-[12px] leading-relaxed text-muted">{s.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div>
                  <div className="label-caps mb-2 flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-success" /> Do this next
                  </div>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                        <CheckCircle2
                          size={15}
                          className="mt-0.5 shrink-0 text-success"
                          strokeWidth={2}
                        />
                        <span className="text-body">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.watchOuts.length > 0 && (
                <div>
                  <div className="label-caps mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-coral" /> Watch outs
                  </div>
                  <ul className="space-y-2">
                    {result.watchOuts.map((w, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                        <AlertTriangle
                          size={15}
                          className="mt-0.5 shrink-0 text-coral"
                          strokeWidth={2}
                        />
                        <span className="text-body">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Segment breakdown */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Breakdown</h2>
          <div className="inline-flex gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
            {DIMS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setDim(key)}
                className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  dim === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <SegmentTable segments={segmentsFor(dim)} dim={dim} />

        {/* Soft context from briefs */}
        {(analysis.industries.length > 0 || analysis.dealSizes.length > 0) && (
          <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            {analysis.industries.length > 0 && (
              <div>
                <div className="label-caps mb-1.5">Industries worked</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.industries.slice(0, 8).map((i) => (
                    <span key={i.name} className="pill">
                      {i.name} <span className="text-muted">×{i.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.dealSizes.length > 0 && (
              <div>
                <div className="label-caps mb-1.5">Deal sizes</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.dealSizes.slice(0, 8).map((d) => (
                    <span key={d.name} className="pill">
                      {d.name} <span className="text-muted">×{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
