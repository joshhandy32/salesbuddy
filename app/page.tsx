"use client";

import { useState } from "react";
import type { BriefResult } from "@/lib/types";
import { AEBriefCard, BDRCoachingCard } from "./components/BriefCards";

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

export default function Home() {
  const [form, setForm] = useState({ email: "", transcript: "", notes: "" });
  const [result, setResult] = useState<BriefResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasInput =
    form.email.trim() || form.transcript.trim() || form.notes.trim();

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setResult(data as BriefResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          SalesBuddy — Brief Engine
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste the raw materials from a discovery handoff. Get an AE brief and a
          BDR coaching note.
        </p>
      </header>

      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-3">
        {INPUTS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col">
            <label
              htmlFor={key}
              className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {label}
            </label>
            <textarea
              id={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              rows={10}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={loading || !hasInput}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Brief"}
        </button>
        {!hasInput && (
          <span className="text-sm text-slate-400">
            Paste at least one input to begin.
          </span>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Outputs — side by side */}
      {result && (
        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <AEBriefCard brief={result.aeBrief} />
          <BDRCoachingCard coaching={result.bdrCoaching} />
        </div>
      )}
    </main>
  );
}
