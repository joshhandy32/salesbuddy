"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneCall, MessageSquare, CalendarCheck2, Play, Pause, RotateCcw, Minus } from "lucide-react";
import Spinner from "./Spinner";

type Counts = { dials: number; connects: number; conversations: number; demosSet: number };
const ZERO: Counts = { dials: 0, connects: 0, conversations: 0, demosSet: 0 };

export type BlitzSessionRow = {
  id: string;
  createdAt: string;
  durationSec: number;
  dials: number;
  connects: number;
  conversations: number;
  demosSet: number;
};

const pctText = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ── One tappable counter ─────────────────────────────────────────────────────
const FIELDS: { key: keyof Counts; label: string; hint: string; Icon: typeof Phone; color: string }[] = [
  { key: "dials", label: "Dials", hint: "D", Icon: Phone, color: "#6a7282" },
  { key: "connects", label: "Connects", hint: "C", Icon: PhoneCall, color: "#2b7fff" },
  { key: "conversations", label: "Conversations", hint: "V", Icon: MessageSquare, color: "#00a877" },
  { key: "demosSet", label: "Demos set", hint: "M", Icon: CalendarCheck2, color: "#eb7360" },
];

export default function BlitzTracker({
  recent,
  todayTotals,
  weekTotals,
}: {
  recent: BlitzSessionRow[];
  todayTotals: Counts & { sessions: number };
  weekTotals: Counts;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Timer tick.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const bump = useCallback((key: keyof Counts, delta: number) => {
    setRunning((r) => r || delta > 0); // auto-start the clock on first activity
    setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] + delta) }));
  }, []);

  // Keyboard shortcuts (ignored while typing in the notes field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const map: Record<string, keyof Counts> = { d: "dials", c: "connects", v: "conversations", m: "demosSet" };
      const key = map[e.key.toLowerCase()];
      if (key) {
        e.preventDefault();
        bump(key, 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump]);

  const total = counts.dials + counts.connects + counts.conversations + counts.demosSet;
  const dirty = total > 0;

  function reset() {
    setCounts(ZERO);
    setElapsed(0);
    setRunning(false);
    setNotes("");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blitz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...counts, durationSec: elapsed, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save the session — try again.");
        return;
      }
      reset();
      router.refresh();
    } catch {
      setError("Couldn't save the session — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Live session card */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Live session</h2>
            <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">
              {clock(elapsed)}
            </span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="btn-tertiary !h-8 !px-2"
              title={running ? "Pause timer" : "Start timer"}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button onClick={reset} className="btn-tertiary !h-8 !px-2" title="Reset session">
              <RotateCcw size={14} />
            </button>
          </div>
          <span className="text-[12px] text-muted">
            Tip: press <kbd className="rounded border border-line bg-page px-1">D</kbd>{" "}
            <kbd className="rounded border border-line bg-page px-1">C</kbd>{" "}
            <kbd className="rounded border border-line bg-page px-1">V</kbd>{" "}
            <kbd className="rounded border border-line bg-page px-1">M</kbd> to count fast
          </span>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FIELDS.map(({ key, label, hint, Icon, color }) => (
            <div key={key} className="rounded-input border border-line p-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted">
                <Icon size={14} style={{ color }} />
                {label}
                <span className="rounded border border-line bg-page px-1 text-[10px] font-semibold text-muted">
                  {hint}
                </span>
              </div>
              <div className="my-1 text-[40px] font-extrabold leading-none tabular-nums" style={{ color }}>
                {counts[key]}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => bump(key, -1)}
                  disabled={counts[key] === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-muted transition-colors hover:bg-page disabled:opacity-40"
                  aria-label={`Decrease ${label}`}
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => bump(key, 1)}
                  className="h-9 flex-1 rounded-[6px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: color }}
                  aria-label={`Add ${label}`}
                >
                  +1
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live rates */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Rate label="Connect rate" value={pctText(counts.connects, counts.dials)} sub="connects / dials" />
          <Rate label="Conversation rate" value={pctText(counts.conversations, counts.connects)} sub="convos / connects" />
          <Rate label="Demos / convo" value={pctText(counts.demosSet, counts.conversations)} sub="demos / convos" />
        </div>

        {/* Notes + save */}
        <div className="mt-4">
          <input
            className="field"
            placeholder="Session notes (optional) — e.g. list worked, best pitch angle…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="mt-2 text-[12px] text-coral-dark">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? (
              <>
                <Spinner className="text-white" /> Saving…
              </>
            ) : (
              "End & save session"
            )}
          </button>
          {dirty && (
            <span className="text-[12px] text-muted">
              {counts.dials} dials · {counts.connects} connects · {counts.demosSet} demos
            </span>
          )}
        </div>
      </section>

      {/* Today / week summary */}
      <div className="grid gap-5 sm:grid-cols-2">
        <SummaryCard
          title="Today"
          subtitle={`${todayTotals.sessions} session${todayTotals.sessions === 1 ? "" : "s"}`}
          totals={todayTotals}
        />
        <SummaryCard title="This week" subtitle="rolling 7 days" totals={weekTotals} />
      </div>

      {/* Recent sessions */}
      <section className="card p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Recent sessions</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">
            No blitz sessions yet. Start dialing above and your sessions will land here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="label-caps py-2 pr-3 font-semibold">When</th>
                  <th className="label-caps py-2 pr-3 font-semibold">Time</th>
                  <th className="label-caps py-2 pr-3 font-semibold text-right">Dials</th>
                  <th className="label-caps py-2 pr-3 font-semibold text-right">Connects</th>
                  <th className="label-caps py-2 pr-3 font-semibold text-right">Convos</th>
                  <th className="label-caps py-2 pr-3 font-semibold text-right">Demos</th>
                  <th className="label-caps py-2 font-semibold text-right">Connect %</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-line/60">
                    <td className="whitespace-nowrap py-2 pr-3 text-body">
                      {fmtDay(s.createdAt)} · {fmtTime(s.createdAt)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted">{clock(s.durationSec)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-body">{s.dials}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-body">{s.connects}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-body">{s.conversations}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-body">{s.demosSet}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-ink">
                      {pctText(s.connects, s.dials)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Rate({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-input border border-line bg-page/50 px-3.5 py-3 text-center">
      <div className="label-caps mb-1">{label}</div>
      <div className="text-[22px] font-bold leading-none text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  totals,
}: {
  title: string;
  subtitle: string;
  totals: Counts;
}) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <span className="text-[12px] text-muted">{subtitle}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {FIELDS.map(({ key, label, color }) => (
          <div key={key}>
            <div className="text-[24px] font-extrabold leading-none tabular-nums" style={{ color }}>
              {totals[key]}
            </div>
            <div className="mt-1 text-[11px] text-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-line pt-3 text-center text-[12px] text-muted">
        Connect rate{" "}
        <span className="font-semibold text-ink">{pctText(totals.connects, totals.dials)}</span>
        {"  ·  "}
        Demos{" "}
        <span className="font-semibold text-ink">{totals.demosSet}</span>
      </div>
    </section>
  );
}
