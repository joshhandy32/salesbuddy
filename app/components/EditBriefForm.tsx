"use client";

import { useState } from "react";
import type { BriefResult, Disposition } from "@/lib/types";

// Deep-ish clone so edits don't mutate the original until saved.
function clone(b: BriefResult): BriefResult {
  return JSON.parse(JSON.stringify(b));
}

const BANT_KEYS = ["budget", "authority", "need", "timeline"] as const;

function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className="field resize-y" rows={props.rows ?? 2} />;
}

export default function EditBriefForm({
  result,
  onSave,
  onCancel,
  saving,
}: {
  result: BriefResult;
  onSave: (corrected: BriefResult) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<BriefResult>(() => clone(result));

  const ae = draft.aeBrief;
  const set = (next: BriefResult) => setDraft(clone(next));

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-coral-dark">
          Edit AE Brief
        </h3>

        <label className="block">
          <span className="label-caps mb-1.5 block">Deal summary</span>
          <Textarea
            value={ae.dealSummary}
            onChange={(e) => {
              ae.dealSummary = e.target.value;
              set(draft);
            }}
          />
        </label>

        <div>
          <span className="label-caps mb-1.5 block">BANT</span>
          <div className="space-y-3">
            {BANT_KEYS.map((k) => (
              <div key={k} className="flex items-start gap-2">
                <label className="flex w-24 shrink-0 items-center gap-1.5 pt-2 text-[12px] capitalize text-body">
                  <input
                    type="checkbox"
                    checked={ae.bant[k].surfaced}
                    onChange={(e) => {
                      ae.bant[k].surfaced = e.target.checked;
                      set(draft);
                    }}
                  />
                  {k}
                </label>
                <Textarea
                  value={ae.bant[k].evidence}
                  onChange={(e) => {
                    ae.bant[k].evidence = e.target.value;
                    set(draft);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label-caps mb-1.5 block">Why now</span>
          <Textarea
            value={ae.whyNow}
            onChange={(e) => {
              ae.whyNow = e.target.value;
              set(draft);
            }}
          />
        </label>

        <div>
          <span className="label-caps mb-1.5 block">Who&apos;s in the room</span>
          <div className="space-y-3">
            {ae.room.map((p, i) => (
              <div key={i} className="rounded-input border border-line p-3">
                <div className="mb-2 flex gap-2">
                  <input
                    className="field"
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => {
                      ae.room[i].name = e.target.value;
                      set(draft);
                    }}
                  />
                  <input
                    className="field"
                    placeholder="Role"
                    value={p.role}
                    onChange={(e) => {
                      ae.room[i].role = e.target.value;
                      set(draft);
                    }}
                  />
                  <select
                    className="field max-w-[130px]"
                    value={p.disposition}
                    onChange={(e) => {
                      ae.room[i].disposition = e.target.value as Disposition;
                      set(draft);
                    }}
                  >
                    <option value="champion">champion</option>
                    <option value="blocker">blocker</option>
                    <option value="neutral">neutral</option>
                  </select>
                  <button
                    type="button"
                    className="btn-secondary px-2"
                    onClick={() => {
                      ae.room.splice(i, 1);
                      set(draft);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <Textarea
                  placeholder="Reason"
                  value={p.reason}
                  onChange={(e) => {
                    ae.room[i].reason = e.target.value;
                    set(draft);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                ae.room.push({
                  name: "",
                  role: "",
                  disposition: "neutral",
                  reason: "",
                });
                set(draft);
              }}
            >
              + Add person
            </button>
          </div>
        </div>

        <label className="block">
          <span className="label-caps mb-1.5 block">Suggested opener</span>
          <Textarea
            value={ae.suggestedOpener}
            onChange={(e) => {
              ae.suggestedOpener = e.target.value;
              set(draft);
            }}
          />
        </label>

        <div>
          <span className="label-caps mb-1.5 block">Top risks / open questions</span>
          <div className="space-y-2">
            {ae.risks.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  value={r}
                  onChange={(e) => {
                    ae.risks[i] = e.target.value;
                    set(draft);
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => {
                    ae.risks.splice(i, 1);
                    set(draft);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                ae.risks.push("");
                set(draft);
              }}
            >
              + Add risk
            </button>
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-teal-ink">
          Edit BDR Coaching Note
        </h3>
        {(
          [
            ["didWell", "What you did well"],
            ["improveNext", "Improve next time"],
            ["qualificationGap", "Qualification gap to probe"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="label-caps mb-1.5 block">{label}</span>
            <Textarea
              value={draft.bdrCoaching[key]}
              onChange={(e) => {
                draft.bdrCoaching[key] = e.target.value;
                set(draft);
              }}
            />
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={() => onSave(draft)}
        >
          {saving ? "Saving…" : "Save corrections"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
