"use client";

import { useState } from "react";
import type { RepDigest, DigestResult, RepPriority } from "@/lib/digest";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";
import StarRating from "./StarRating";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function TrendBadge({ trend }: { trend: RepDigest["trend"] }) {
  if (trend === "improving")
    return (
      <span className="pill pill-teal">
        <TrendingUp size={12} /> Improving
      </span>
    );
  if (trend === "sliding")
    return (
      <span className="pill pill-coral">
        <TrendingDown size={12} /> Sliding
      </span>
    );
  if (trend === "steady")
    return (
      <span className="pill">
        <Minus size={12} /> Steady
      </span>
    );
  return <span className="pill text-muted">Not enough data</span>;
}

function WeekOverWeek({ rep }: { rep: RepPriority | undefined }) {
  if (!rep?.lastPriority) return null;
  const improving = rep.improvedOnLastPriority === "improving";
  const notYet = rep.improvedOnLastPriority === "not_yet";
  return (
    <div className="mt-2 rounded-input border border-line bg-page/50 px-3 py-2 text-[12px]">
      <span className="text-muted">Last week: </span>
      <span className="text-body">{rep.lastPriority}</span>
      {(improving || notYet) && (
        <span className={improving ? "text-teal-ink" : "text-coral-dark"}>
          {" "}
          — {improving ? "showing improvement" : "not yet showing improvement"}
        </span>
      )}
    </div>
  );
}

export default function DigestTool({ digests }: { digests: RepDigest[] }) {
  const [tab, setTab] = useState<"coaching" | "objections">("coaching");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DigestResult | null>(null);

  const repResult = (rep: string) => result?.reps.find((r) => r.repName === rep);

  const improving = digests.filter((d) => d.trend === "improving").map((d) => d.repName);
  const needsAttention = digests
    .filter((d) => d.trend === "sliding" || (d.avgRating != null && d.avgRating <= 2.5))
    .map((d) => d.repName);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJSON<DigestResult>("POST", "/api/digest", undefined, 30000);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof TimeoutError
          ? TIMEOUT_MSG
          : "Something went wrong analyzing the team — please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (digests.length === 0) {
    return (
      <EmptyState
        title="No brief data yet"
        message="Generate and rate some briefs first to unlock per-rep coaching priorities."
        actionLabel="Go to Brief Engine"
        actionHref="/brief"
      />
    );
  }

  const tabBtn = (key: "coaching" | "objections", label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`rounded-btn px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        tab === key ? "bg-coral text-white" : "text-body hover:bg-coral-bg/60"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Tabs + generate */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-btn border border-line p-0.5">
          {tabBtn("coaching", "Coaching")}
          {tabBtn("objections", "Objection Patterns")}
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? (
            <>
              <Spinner className="text-white" />
              Analyzing rep data…
            </>
          ) : result ? (
            "Regenerate"
          ) : (
            "Generate coaching priorities"
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-input border border-coral/30 bg-coral-bg px-4 py-3 text-[13px] text-coral-dark">
          {error}
        </div>
      )}

      {tab === "coaching" ? (
        <>
          {/* Team view */}
          <section className="card p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-ink">Team view</h2>
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
                  {result?.teamCommonGap || <span className="text-muted">Generate to see</span>}
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

          {/* Per-rep cards */}
          <div className="space-y-4">
            {digests.map((d) => {
              const rp = repResult(d.repName);
              return (
                <section key={d.repName} className="card p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral text-[12px] font-bold text-white">
                        {d.repName.slice(0, 2).toUpperCase()}
                      </span>
                      <h3 className="text-[15px] font-semibold text-ink">{d.repName}</h3>
                      <TrendBadge trend={d.trend} />
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-muted">
                      <span>{d.briefCount} brief{d.briefCount === 1 ? "" : "s"}</span>
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

                  <div className="mb-3">
                    <div className="label-caps mb-1.5">Coaching priority</div>
                    {rp ? (
                      <p className="rounded-input bg-coral-bg px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                        {rp.priority}
                      </p>
                    ) : (
                      <p className="text-[13px] italic text-muted">
                        Click “Generate coaching priorities” to synthesize this rep&apos;s
                        top priority from their calls.
                      </p>
                    )}
                    <WeekOverWeek rep={rp} />
                  </div>

                  <div>
                    <div className="label-caps mb-1.5">Evidence</div>
                    <ul className="space-y-1 text-[12px] text-muted">
                      {d.bantNotSurfaced.length > 0 && (
                        <li>
                          <span className="text-body">BANT unprobed:</span>{" "}
                          {d.bantNotSurfaced
                            .map((x) => `${x.dimension} ${x.notSurfaced}/${x.total}`)
                            .join(", ")}
                        </li>
                      )}
                      {d.correctedFields.length > 0 && (
                        <li>
                          <span className="text-body">Most-corrected fields:</span>{" "}
                          {d.correctedFields.slice(0, 3).map((f) => `${f.field} ×${f.count}`).join(", ")}
                        </li>
                      )}
                      {d.lowRated.length > 0 && (
                        <li>
                          <span className="text-body">Low-rated briefs (≤2):</span> {d.lowRated.length}
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
                          <span className="text-body">Feedback notes:</span> {d.feedbackNotes.length}
                        </li>
                      )}
                      {d.bantNotSurfaced.length === 0 &&
                        d.correctedFields.length === 0 &&
                        d.lowRated.length === 0 &&
                        d.qualificationGaps.length === 0 &&
                        d.feedbackNotes.length === 0 && (
                          <li>No corrections, low ratings, or unprobed BANT yet.</li>
                        )}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        // Objection Patterns tab
        <div className="space-y-4">
          {result?.objections?.length ? (
            result.objections.map((o, i) => (
              <section key={i} className="card p-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-coral" />
                  <h3 className="text-[14px] font-semibold text-ink">{o.label}</h3>
                </div>
                <p className="mb-2 text-[13px] text-body">{o.summary}</p>
                <div className="rounded-input bg-page/60 px-3.5 py-2.5">
                  <div className="label-caps mb-1">Suggested response</div>
                  <p className="text-[13px] leading-relaxed text-ink">{o.suggestedResponse}</p>
                </div>
              </section>
            ))
          ) : (
            <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
              <p className="text-[14px] font-medium text-ink">No objection library yet</p>
              <p className="max-w-sm text-[13px] text-muted">
                This builds itself from your team&apos;s calls. Click “Generate coaching
                priorities” above to scan every brief and surface the recurring objections.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
