"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Phone, Mail, ArrowRight, CheckSquare, UserPlus } from "lucide-react";
import Spinner from "./Spinner";

type Step = { day: number; type: string; title: string };
export type Cadence = { id: string; name: string; steps: Step[] };
type ContactOpt = { id: string; name: string };

const STEP_TYPES = [
  { key: "EMAIL", label: "Email", Icon: Mail },
  { key: "CALL", label: "Call", Icon: Phone },
  { key: "FOLLOWUP", label: "Follow-up", Icon: ArrowRight },
  { key: "TODO", label: "To-do", Icon: CheckSquare },
] as const;
const stepIcon = (t: string) => STEP_TYPES.find((s) => s.key === t)?.Icon ?? ArrowRight;

const STARTER: { name: string; steps: Step[] } = {
  name: "5-day outbound",
  steps: [
    { day: 0, type: "EMAIL", title: "Send intro email" },
    { day: 1, type: "CALL", title: "Cold call + voicemail" },
    { day: 3, type: "EMAIL", title: "Follow-up email with case study" },
    { day: 5, type: "CALL", title: "Second call attempt" },
    { day: 8, type: "EMAIL", title: "Break-up email" },
  ],
};

export default function Cadences({ initial, contacts }: { initial: Cadence[]; contacts: ContactOpt[] }) {
  const router = useRouter();
  const [cadences, setCadences] = useState<Cadence[]>(initial);
  const [editing, setEditing] = useState<Cadence | "new" | null>(null);
  const [enrollFor, setEnrollFor] = useState<Cadence | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  async function remove(id: string) {
    setCadences((list) => list.filter((c) => c.id !== id));
    await fetch(`/api/cadences/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  async function addStarter() {
    setBusy(true);
    try {
      const res = await fetch("/api/cadences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(STARTER),
      });
      if (res.ok) {
        const c = await res.json();
        setCadences((list) => [...list, { id: c.id, name: c.name, steps: STARTER.steps }]);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{cadences.length}</span> cadence
          {cadences.length === 1 ? "" : "s"}
        </span>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} /> New cadence
        </button>
      </div>

      {editing && (
        <CadenceForm
          cadence={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(c, isNew) => {
            setCadences((list) => (isNew ? [...list, c] : list.map((x) => (x.id === c.id ? c : x))));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {cadences.length === 0 && !editing ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-ink">No cadences yet</p>
          <p className="max-w-sm text-[13px] text-muted">
            Build a multi-touch sequence, or start from a proven 5-day outbound template you can edit.
          </p>
          <button className="btn-primary mt-1" onClick={addStarter} disabled={busy}>
            {busy ? (
              <>
                <Spinner className="text-white" /> Adding…
              </>
            ) : (
              "Add starter cadence"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cadences.map((c) => (
            <section key={c.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary !h-8" onClick={() => setEnrollFor(c)}>
                    <UserPlus size={14} /> Enroll
                  </button>
                  <button onClick={() => setEditing(c)} className="rounded p-1.5 text-muted hover:text-ink" aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(c.id)} className="rounded p-1.5 text-muted hover:text-coral-dark" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <ol className="space-y-1.5">
                {c.steps.map((s, i) => {
                  const I = stepIcon(s.type);
                  return (
                    <li key={i} className="flex items-center gap-3 text-[13px]">
                      <span className="w-14 shrink-0 text-[12px] font-medium text-muted">
                        {s.day === 0 ? "Day 0" : `Day ${s.day}`}
                      </span>
                      <I size={14} className="shrink-0 text-muted" />
                      <span className="text-body">{s.title}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {enrollFor && (
        <EnrollModal
          cadence={enrollFor}
          contacts={contacts}
          onClose={() => setEnrollFor(null)}
          onEnrolled={(n) => {
            setEnrollFor(null);
            showToast(`Enrolled — ${n} task${n === 1 ? "" : "s"} added.`);
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div className="animate-toast fixed bottom-5 right-5 z-[70] rounded-input bg-navy px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function EnrollModal({
  cadence,
  contacts,
  onClose,
  onEnrolled,
}: {
  cadence: Cadence;
  contacts: ContactOpt[];
  onClose: () => void;
  onEnrolled: (n: number) => void;
}) {
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (!contactId) {
      setError("Pick a contact.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cadences/${cadence.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Couldn't enroll — try again.");
        return;
      }
      onEnrolled(d.enrolled);
    } catch {
      setError("Couldn't enroll — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 p-4 pt-[15vh]" onClick={onClose}>
      <div className="card w-full max-w-md p-5 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Enroll in “{cadence.name}”</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[13px] text-muted">
          Adds {cadence.steps.length} dated task{cadence.steps.length === 1 ? "" : "s"} to the contact, starting today.
        </p>
        {contacts.length === 0 ? (
          <p className="text-[13px] text-muted">Add a contact first to enroll them.</p>
        ) : (
          <select className="field" value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">— Pick a contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {error && <p className="mt-2 text-[12px] text-coral-dark">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button className="btn-primary" onClick={enroll} disabled={busy || contacts.length === 0}>
            {busy ? "Enrolling…" : "Enroll contact"}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CadenceForm({
  cadence,
  onCancel,
  onSaved,
}: {
  cadence: Cadence | null;
  onCancel: () => void;
  onSaved: (c: Cadence, isNew: boolean) => void;
}) {
  const [name, setName] = useState(cadence?.name ?? "");
  const [steps, setSteps] = useState<Step[]>(
    cadence?.steps.length ? cadence.steps : [{ day: 0, type: "EMAIL", title: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStep = (i: number, patch: Partial<Step>) =>
    setSteps((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () =>
    setSteps((list) => [...list, { day: (list[list.length - 1]?.day ?? 0) + 2, type: "FOLLOWUP", title: "" }]);
  const removeStep = (i: number) => setSteps((list) => list.filter((_, idx) => idx !== i));

  async function save() {
    if (!name.trim()) {
      setError("Cadence name is required.");
      return;
    }
    const valid = steps.filter((s) => s.title.trim());
    if (valid.length === 0) {
      setError("Add at least one step with a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = !cadence;
      const res = await fetch(isNew ? "/api/cadences" : `/api/cadences/${cadence!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, steps: valid }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save — try again.");
        return;
      }
      const row = await res.json();
      let parsed: Step[] = [];
      try {
        parsed = JSON.parse(row.steps);
      } catch {
        parsed = valid;
      }
      onSaved({ id: row.id, name: row.name, steps: parsed }, isNew);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">{cadence ? "Edit cadence" : "New cadence"}</h3>
        <button onClick={onCancel} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <input
        className="field"
        placeholder="Cadence name — e.g. Enterprise outbound"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="space-y-2">
        <span className="label-caps block">Steps</span>
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[12px] text-muted">Day</span>
              <input
                type="number"
                min={0}
                className="field !h-8 w-16 !py-0 text-[13px]"
                value={s.day}
                onChange={(e) => setStep(i, { day: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <select
              className="field !h-8 w-28 shrink-0 !py-0 text-[13px]"
              value={s.type}
              onChange={(e) => setStep(i, { type: e.target.value })}
            >
              {STEP_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="field !h-8 flex-1 !py-0 text-[13px]"
              placeholder="What to do"
              value={s.title}
              onChange={(e) => setStep(i, { title: e.target.value })}
            />
            <button
              onClick={() => removeStep(i)}
              disabled={steps.length === 1}
              className="shrink-0 rounded p-1.5 text-muted hover:text-coral-dark disabled:opacity-30"
              aria-label="Remove step"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button className="btn-tertiary !h-8 !px-2" onClick={addStep}>
          <Plus size={14} /> Add step
        </button>
      </div>
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : cadence ? "Save changes" : "Create cadence"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
