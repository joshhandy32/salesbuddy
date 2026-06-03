"use client";

import { useState } from "react";
import type { RepDigest, DigestResult } from "@/lib/digest";
import StarRating from "./StarRating";

function TrendBadge({ trend }: { trend: RepDigest["trend"] }) {
  if (trend === "improving")
    return <span className="pill pill-teal">↑ Improving</span>;
  if (trend === "sliding")
    return <span className="pill pill-coral">↓ Sliding</span>;
  if (trend === "steady") return <span className="pill">→ Steady</span>;
  return <span className="pill text-muted">Not enough data</span>;
}

export default function DigestTool({ digests }: { digests: RepDigest[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DigestResult | null>(null);

  const priorityFor = (rep: string) =>
    result?.reps.find((r) => r.repName === rep)?.priority ?? null;

  // Team rollup straight from the data.
  const improving = digests.filter((d) => d.trend === "improving").map((d) => d.repName);
  const needsAttention = digests
    .filter((d) => d.trend === "sliding" || (d.avgRating != null && d.avgRating <= 2.5))
    .map((d) => d.repName);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data as DigestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (digests.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-[14px] font-medium text-ink">No rep data yet</p>
        <p className="text-[13px] text-muted">
          Generate briefs (with a rep name) and they&apos;ll roll up here for coaching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team view */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Team view</h2>
          <button className="btn-primary" onClick={generate} disabled={loading}>
            {loading
              ? "Synthesizing…"
              : result
                ? "Regenerate coaching priorities"
                : "Generate coaching priorities"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-input border border-line bg-page/50 px-3.5 py-3">
            <div className="label-caps mb-1.5">Improving</div>
            {improving.length ? (
              <div className="flex flex-wrap gap-1.5">
                {improving.map((r) => (
                  <span key={r} className="pill pill-teal">{r}</span>
                ))}
              </div>
            ) : (
              <span className="text-[13px] text-muted">—</span>
            )}
          </div>
          <div className="rounded-input border border-line bg-page/50 px-3.5 py-3">
            <div className="label-caps mb-1.5">Needs attention</div>
            {needsAttention.length ? (
              <div className="flex flex-wrap gap-1.5">
                {needsAttention.map((r) => (
                  <span key={r} className="pill pill-coral">{r}</span>
                ))}
              </div>
            ) : (
              <span className="text-[13px] text-muted">—</span>
            )}
          </div>
          <div className="rounded-input border border-line bg-page/50 px-3.5 py-3">
            <div className="label-caps mb-1.5">Most common gap</div>
            <span className="text-[13px] text-ink">
              {result?.teamCommonGap || (
                <span className="text-muted">Generate to see</span>
              )}
            </span>
          </div>
        </div>

        {result?.teamTakeaway && (
          <p className="mt-4 rounded-input bg-coral-bg px-4 py-3 text-[13px] leading-relaxed text-coral-dark">
            <span className="font-semibold">Takeaway: </span>
            {result.teamTakeaway}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-input border border-coral/30 bg-coral-bg px-4 py-3 text-[13px] text-coral-dark">
          {error}
        </div>
      )}

      {/* Per-rep cards */}
      <div className="space-y-4">
        {digests.map((d) => {
          const priority = priorityFor(d.repName);
          return (
            <section key={d.repName} className="card p-5">
              {/* Header row */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral text-[12px] font-bold text-white">
                    {d.repName.slice(0, 2).toUpperCase()}
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink">{d.repName}</h3>
                  <TrendBadge trend={d.trend} />
                </div>
                <div className="flex items-center gap-3 text-[12px] text-muted">
                  <span>
                    {d.briefCount} brief{d.briefCount === 1 ? "" : "s"}
                  </span>
                  {d.avgRating != null ? (
                    <span className="flex items-center gap-1.5">
                      <StarRating value={Math.round(d.avgRating)} readOnly />
                      {d.avgRating.toFixed(1)}/5
                    </span>
                  ) : (
                    <span>unrated</span>
                  )}
                </div>
              </div>

              {/* Coaching priority */}
              <div className="mb-3">
                <div className="label-caps mb-1.5">Coaching priority</div>
                {priority ? (
                  <p className="rounded-input bg-coral-bg px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                    {priority}
                  </p>
                ) : (
                  <p className="text-[13px] italic text-muted">
                    Click “Generate coaching priorities” to synthesize this rep&apos;s
                    top priority from their data.
                  </p>
                )}
              </div>

              {/* Evidence */}
              <div>
                <div className="label-caps mb-1.5">Evidence</div>
                <ul className="space-y-1 text-[12px] text-muted">
                  {d.correctedFields.length > 0 && (
                    <li>
                      <span className="text-body">Most-corrected fields:</span>{" "}
                      {d.correctedFields
                        .slice(0, 3)
                        .map((f) => `${f.field} ×${f.count}`)
                        .join(", ")}
                    </li>
                  )}
                  {d.lowRated.length > 0 && (
                    <li>
                      <span className="text-body">Low-rated briefs (≤2):</span>{" "}
                      {d.lowRated.length}
                    </li>
                  )}
                  {d.qualificationGaps.length > 0 && (
                    <li>
                      <span className="text-body">Recurring gaps flagged:</span>{" "}
                      {d.qualificationGaps.slice(0, 2).join(" · ")}
                    </li>
                  )}
                  {d.feedbackNotes.length > 0 && (
                    <li>
                      <span className="text-body">Feedback notes:</span>{" "}
                      {d.feedbackNotes.length}
                    </li>
                  )}
                  {d.correctedFields.length === 0 &&
                    d.lowRated.length === 0 &&
                    d.qualificationGaps.length === 0 &&
                    d.feedbackNotes.length === 0 && (
                      <li>No corrections, low ratings, or feedback yet.</li>
                    )}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
