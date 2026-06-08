"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, Image as ImageIcon, Sparkles, Check } from "lucide-react";
import {
  parseOrumCSV,
  mapToHistorical,
  orumPct,
  formatDuration,
  type OrumRow,
  type OrumReport,
} from "@/lib/orum";
import { monthLabel } from "@/lib/pacingMath";
import Spinner from "./Spinner";

type MonthOpt = { id: string; month: string };

type Mode = "csv" | "png";

export default function OrumImport({
  months,
  defaultMonth,
  onClose,
}: {
  months: MonthOpt[];
  defaultMonth: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("csv");
  const [csvText, setCsvText] = useState("");
  const [report, setReport] = useState<OrumReport | null>(null);
  const [selectedRep, setSelectedRep] = useState<string>("");
  const [targetMonth, setTargetMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse pasted/typed CSV live.
  const csvReport = useMemo(() => (csvText.trim() ? parseOrumCSV(csvText) : null), [csvText]);
  const active = report ?? csvReport;

  // All selectable rows: per-rep rows + Total (labeled).
  const choices: OrumRow[] = useMemo(() => {
    if (!active) return [];
    const list = [...active.rows];
    if (active.total) list.push(active.total);
    return list;
  }, [active]);

  const chosen: OrumRow | null = useMemo(() => {
    if (!choices.length) return null;
    if (selectedRep) {
      const hit = choices.find((r) => r.repName === selectedRep);
      if (hit) return hit;
    }
    // Default: the single rep if there's one, else the Total, else first.
    if (active?.rows.length === 1) return active.rows[0];
    return active?.total ?? choices[0];
  }, [choices, selectedRep, active]);

  function loadFile(file: File) {
    setError(null);
    setApplied(false);
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setError(
        "XLSX isn't supported yet — in Orum's download menu choose “Download CSV (raw data)” instead.",
      );
      return;
    }
    if (mode === "csv") {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        setCsvText(text);
        const r = parseOrumCSV(text);
        if (r.rows.length === 0 && !r.total) {
          setError("That doesn't look like an Orum CSV export. Use “Download CSV (raw data)”.");
        }
        setReport(null);
      };
      reader.readAsText(file);
    } else {
      extractFromImage(file);
    }
  }

  async function extractFromImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Pick a PNG or image of the Orum table.");
      return;
    }
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/orum/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't read that image — try the CSV export.");
        return;
      }
      setCsvText("");
      setReport(data as OrumReport);
      if ((data.rows?.length ?? 0) === 0 && !data.total) {
        setError("No rows found in that image. Try a clearer screenshot or the CSV export.");
      }
    } catch {
      setError("Couldn't read that image — try the CSV export.");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!chosen) return;
    const target = months.find((m) => m.month === targetMonth);
    if (!target) {
      setError("Pick a month that exists in your historicals (add it first).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const patch = mapToHistorical(chosen);
      const res = await fetch(`/api/historicals/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't apply — try again.");
        return;
      }
      setApplied(true);
      router.refresh();
    } catch {
      setError("Couldn't apply — try again.");
    } finally {
      setLoading(false);
    }
  }

  const patch = chosen ? mapToHistorical(chosen) : null;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Upload size={15} /> Import from Orum
        </h3>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
        <button
          onClick={() => {
            setMode("csv");
            setReport(null);
            setError(null);
          }}
          className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            mode === "csv" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
          }`}
        >
          <FileText size={13} /> CSV (recommended)
        </button>
        <button
          onClick={() => {
            setMode("png");
            setCsvText("");
            setError(null);
          }}
          className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            mode === "png" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
          }`}
        >
          <ImageIcon size={13} /> PNG / image
        </button>
      </div>

      {mode === "csv" ? (
        <div className="space-y-2">
          <p className="text-[12px] text-muted">
            In Orum&apos;s analytics download menu choose <span className="font-medium text-body">Download CSV (raw data)</span>,
            then upload it or paste its contents below.
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            />
          </div>
          <textarea
            className="field resize-y font-mono text-[12px]"
            rows={4}
            placeholder='Paste CSV here — e.g. "Rep name","Dials",...'
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setReport(null);
              setApplied(false);
            }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="flex items-start gap-1.5 rounded-input border border-[#f3d9c4] bg-[#fffaf5] px-3 py-2 text-[12px] text-[#b45309]">
            <Sparkles size={14} className="mt-0.5 shrink-0" />
            Image import uses AI to read the table. Double-check the numbers below before applying. CSV is the reliable path.
          </p>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? <Spinner /> : <ImageIcon size={14} />} Upload Orum PNG
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          />
        </div>
      )}

      {error && <p className="text-[12px] text-coral-dark">{error}</p>}

      {/* Preview */}
      {chosen && patch && (
        <div className="space-y-3 rounded-input border border-line bg-page/40 p-4">
          {choices.length > 1 && (
            <label className="block">
              <span className="label-caps mb-1.5 block">Which row to import</span>
              <select
                className="field !h-9"
                value={chosen.repName}
                onChange={(e) => setSelectedRep(e.target.value)}
              >
                {choices.map((r) => (
                  <option key={r.repName} value={r.repName}>
                    {r.isTotal ? "Total (all reps)" : r.repName}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Funnel */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <Metric label="Dials" value={patch.dials.toLocaleString()} />
            <Metric label="Connects" value={String(patch.connects)} sub={orumPct(chosen.dialToConnect)} />
            <Metric label="Conversations" value={String(patch.conversations)} sub={orumPct(chosen.connectToConversation)} />
            <Metric label="Meetings" value={String(patch.orumDemoSets)} sub={orumPct(chosen.conversationToMeeting)} accent />
          </div>

          {/* Secondary */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-[12px] text-muted">
            <span>Callbacks: <span className="text-body">{chosen.callbacks}</span></span>
            <span>Callback connects: <span className="text-body">{chosen.callbackConnects}</span> ({orumPct(chosen.callbackToConnect)})</span>
            <span>Talk time: <span className="text-body">{formatDuration(chosen.talkTime)}</span></span>
            <span>Session: <span className="text-body">{formatDuration(chosen.sessionTime)}</span></span>
          </div>

          {/* Apply */}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <span className="text-[13px] text-muted">Apply Dials / Connects / Conversations / Meetings to</span>
            <select
              className="field !h-9 w-40"
              value={targetMonth}
              onChange={(e) => {
                setTargetMonth(e.target.value);
                setApplied(false);
              }}
            >
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {monthLabel(m.month)}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={apply} disabled={loading || applied}>
              {applied ? (
                <>
                  <Check size={15} /> Applied
                </>
              ) : loading ? (
                <>
                  <Spinner className="text-white" /> Applying…
                </>
              ) : (
                "Apply to historicals"
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Meetings import as Orum demo sets. Shows, completes, revenue still come from your logged demos.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-input border px-2 py-2.5 ${accent ? "border-coral/30 bg-coral-bg" : "border-line bg-white"}`}>
      <div className={`text-[20px] font-bold leading-none ${accent ? "text-coral-dark" : "text-ink"}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium text-muted">{label}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}
