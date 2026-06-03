"use client";

import { useState } from "react";
import type { BriefResult, SavedBrief } from "@/lib/types";
import { AEBriefCard, BDRCoachingCard } from "./BriefCards";
import EditBriefForm from "./EditBriefForm";
import StarRating from "./StarRating";

export default function BriefResultPanel({ initial }: { initial: SavedBrief }) {
  const [brief, setBrief] = useState<SavedBrief>(initial);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [note, setNote] = useState(initial.feedbackNote ?? "");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  // The version shown: the rep's correction if there is one, else the AI output.
  const shown: BriefResult = brief.corrected ?? brief.result;

  async function patch(body: Record<string, unknown>, okMsg: string) {
    try {
      const res = await fetch(`/api/brief/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      setBrief((await res.json()) as SavedBrief);
      setStatus({ text: okMsg, ok: true });
      setTimeout(() => setStatus(null), 2500);
      return true;
    } catch {
      setStatus({ text: "Couldn't save — please try again.", ok: false });
      return false;
    }
  }

  async function saveCorrection(corrected: BriefResult) {
    setSavingEdit(true);
    const ok = await patch({ corrected }, "Corrections saved");
    setSavingEdit(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <EditBriefForm
        result={shown}
        saving={savingEdit}
        onSave={saveCorrection}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* The two briefs, side by side */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <AEBriefCard brief={shown.aeBrief} />
        <BDRCoachingCard coaching={shown.bdrCoaching} />
      </div>

      {/* Feedback bar */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="label-caps">Rate this brief</span>
            <StarRating
              value={brief.rating}
              onChange={(n) => patch({ rating: n }, "Rating saved")}
            />
          </div>
          <div className="flex items-center gap-3">
            {brief.corrected && <span className="pill pill-coral">Edited</span>}
            {status && (
              <span
                className={`text-[12px] ${status.ok ? "text-teal-ink" : "text-coral-dark"}`}
              >
                {status.text}
              </span>
            )}
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit brief
            </button>
          </div>
        </div>

        <div>
          <span className="label-caps mb-1.5 block">
            Feedback for future briefs
          </span>
          <textarea
            className="field resize-y"
            rows={2}
            placeholder="What should the next brief do differently? (fed into memory)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-2">
            <button
              className="btn-secondary"
              disabled={savingNote}
              onClick={async () => {
                setSavingNote(true);
                await patch({ feedbackNote: note }, "Feedback saved");
                setSavingNote(false);
              }}
            >
              {savingNote ? "Saving…" : "Save feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
