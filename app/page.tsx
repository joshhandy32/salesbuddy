"use client";

import { useState } from "react";
import type { SavedBrief } from "@/lib/types";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";
import BriefResultPanel from "./components/BriefResultPanel";
import Spinner from "./components/Spinner";

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

export default function Home() {
  const [form, setForm] = useState({ email: "", transcript: "", notes: "" });
  const [repName, setRepName] = useState("");
  const [result, setResult] = useState<SavedBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        { ...form, repName },
        30000,
      );
      setResult(data);
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
        <p className="mt-3 rounded-input border border-line bg-page px-3.5 py-2.5 text-[12px] text-body">
          ⚠︎ This is very long — consider trimming it for best results (the AI may
          truncate or run slow on extremely long inputs).
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

      {error && (
        <div className="mt-6 rounded-input border border-coral/30 bg-coral-bg px-4 py-3 text-[13px] text-coral-dark">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <BriefResultPanel initial={result} />
        </div>
      )}
    </main>
  );
}
