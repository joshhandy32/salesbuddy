"use client";

import { useState } from "react";
import type { SavedBrief } from "@/lib/types";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";
import BriefResultPanel from "../components/BriefResultPanel";
import Spinner from "../components/Spinner";
import { AlertTriangle } from "lucide-react";

const INPUTS = [
  {
    key: "email" as const,
    label: "Prospect email",
    placeholder: "Paste the prospect's email thread…",
  },
  {
    key: "transcript" as const,
    label: "Call transcript",
    placeholder: "Paste the discovery-call transcript…",
  },
  {
    key: "notes" as const,
    label: "BDR notes",
    placeholder: "Paste the BDR's raw notes…",
  },
];

// Warn (don't block) when the inputs are very long and may strain token limits.
const LONG_INPUT_CHARS = 24000;

const META = [
  { key: "company" as const, label: "Prospect company", placeholder: "e.g. Northwind Logistics" },
  { key: "dealSize" as const, label: "Deal size", placeholder: "e.g. $25k or $20–40k" },
  { key: "industry" as const, label: "Industry", placeholder: "e.g. Logistics" },
  { key: "aeName" as const, label: "AE name", placeholder: "e.g. Jordan" },
];

export default function Home() {
  const [form, setForm] = useState({ email: "", transcript: "", notes: "" });
  const [meta, setMeta] = useState({ company: "", dealSize: "", industry: "", aeName: "" });
  const [repName, setRepName] = useState("");
  const [result, setResult] = useState<SavedBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendToSlack, setSendToSlack] = useState(true);

  const hasInput =
    !!form.email.trim() || !!form.transcript.trim() || !!form.notes.trim();
  const totalChars =
    form.email.length + form.transcript.length + form.notes.length;
  const tooLong = totalChars > LONG_INPUT_CHARS;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await requestJSON<SavedBrief>(
        "POST",
        "/api/brief",
        { ...form, ...meta, repName },
        30000,
      );
      setResult(data);
      // Make the brief available to the global "Log Demo Set" modal for pre-fill.
      try {
        sessionStorage.setItem("sb:lastBrief", JSON.stringify(data));
      } catch {
        /* ignore storage errors */
      }
    } catch (err) {
      setError(
        err instanceof TimeoutError
          ? TIMEOUT_MSG
          : "Something went wrong generating the brief — please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Brief Engine</h1>
        <p className="mt-1 text-[13px] text-muted">
          Paste the raw materials from a discovery handoff. Get an AE brief and a
          BDR coaching note — saved to history and remembered next time.
        </p>
      </header>

      {/* Rep name */}
      <div className="mb-4 max-w-xs">
        <label htmlFor="repName" className="label-caps mb-1.5 block">
          Rep name <span className="normal-case text-muted">(optional)</span>
        </label>
        <input
          id="repName"
          className="field"
          placeholder="e.g. Sam"
          value={repName}
          onChange={(e) => setRepName(e.target.value)}
        />
      </div>

      {/* Deal metadata (optional) */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {META.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label htmlFor={key} className="label-caps mb-1.5 block">
              {label} <span className="normal-case text-muted">(optional)</span>
            </label>
            <input
              id={key}
              className="field"
              placeholder={placeholder}
              value={meta[key]}
              onChange={(e) => setMeta({ ...meta, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-3">
        {INPUTS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col">
            <label htmlFor={key} className="label-caps mb-1.5">
              {label}
            </label>
            <textarea
              id={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              rows={10}
              className="field resize-y"
            />
          </div>
        ))}
      </div>

      {/* Long-input warning */}
      {tooLong && (
        <p className="mt-3 flex items-start gap-2 rounded-input border border-line bg-page px-3.5 py-2.5 text-[12px] text-body">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-coral" />
          <span>
            This is very long — consider trimming it for best results (the AI may
            truncate or run slow on extremely long inputs).
          </span>
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={loading || !hasInput}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Spinner className="text-white" />
              Generating brief…
            </>
          ) : (
            "Generate Brief"
          )}
        </button>
        {!hasInput && (
          <span className="text-[13px] text-muted">
            Paste at least one input to begin.
          </span>
        )}
      </div>

      {/* Slack routing toggle */}
      <div className="mt-4">
        <label className="flex cursor-pointer select-none items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={sendToSlack}
            onClick={() => setSendToSlack((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              sendToSlack ? "bg-coral" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                sendToSlack ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="shrink-0 text-[13px] font-medium text-ink">Send to Slack</span>
        </label>
        <p className="mt-1 text-[11px] text-muted">
          Currently routing to one channel — AE and BDR channels will be split later.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-input border border-coral/30 bg-coral-bg px-4 py-3 text-[13px] text-coral-dark">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <BriefResultPanel key={result.id} initial={result} autoSendSlack={sendToSlack} />
        </div>
      )}
    </main>
  );
}
