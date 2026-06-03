"use client";

import { useState, useEffect, useRef } from "react";
import type { BriefResult, SavedBrief } from "@/lib/types";
import { AEBriefCard, BDRCoachingCard, FollowUpEmailCard } from "./BriefCards";
import EditBriefForm from "./EditBriefForm";
import StarRating from "./StarRating";
import ChatPanel from "./ChatPanel";
import Spinner from "./Spinner";

export default function BriefResultPanel({
  initial,
  autoSendSlack = false,
}: {
  initial: SavedBrief;
  autoSendSlack?: boolean;
}) {
  const [brief, setBrief] = useState<SavedBrief>(initial);
  const [slack, setSlack] = useState<"sending" | { ok: boolean; at?: string } | null>(
    null,
  );
  const slackSent = useRef(false);

  // Auto-route to Slack once for a freshly generated brief. A failure here never
  // affects the brief (already saved + displayed) — it just shows a notice.
  useEffect(() => {
    if (!autoSendSlack || slackSent.current) return;
    slackSent.current = true;
    setSlack("sending");
    fetch(`/api/brief/${brief.id}/slack`, { method: "POST" })
      .then((r) => r.json())
      .then((d) =>
        setSlack({
          ok: !!d.ok,
          at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }),
      )
      .catch(() => setSlack({ ok: false }));
  }, [autoSendSlack, brief.id]);
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
      {/* The three outputs, side by side */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <AEBriefCard brief={shown.aeBrief} />
        <BDRCoachingCard coaching={shown.bdrCoaching} />
        {shown.followUpEmail && <FollowUpEmailCard email={shown.followUpEmail} />}
      </div>

      {/* Slack delivery confirmation */}
      {slack === "sending" && (
        <p className="flex items-center gap-2 text-[12px] text-muted">
          <Spinner /> Sending to Slack…
        </p>
      )}
      {slack && slack !== "sending" && (
        <p className={`text-[12px] ${slack.ok ? "text-teal-ink" : "text-coral-dark"}`}>
          {slack.ok
            ? `Sent to Slack ✓ ${slack.at}`
            : "Slack delivery failed — brief saved locally"}
        </p>
      )}

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

      {/* Follow-up chat scoped to this brief */}
      <ChatPanel briefId={brief.id} />
    </div>
  );
}
