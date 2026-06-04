"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

const SET_TYPES = [
  { v: "CC", l: "CC (Cold Call)" },
  { v: "LinkedIn", l: "LinkedIn" },
  { v: "Email", l: "Email" },
  { v: "RSC", l: "RSC (Reschedule)" },
  { v: "FL", l: "FL (Follow Up)" },
];

type Fields = {
  setType: string;
  prospect: string;
  need: string;
  demoDate: string;
  aeName: string;
  notes: string;
  contactId: string;
};

type ContactOpt = { id: string; name: string; company: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function weekday(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "long" });
}
function longDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Empty fields show as faded bracketed placeholders so the line still reads as
// a live preview (not a broken "Set CC - - - Wednesday").
const ph = (v: string, label: string) => (v.trim() ? v.trim() : `[${label}]`);
const buildPreview = (f: Fields, name: string) =>
  `Set ${f.setType} - ${ph(f.prospect, "Prospect")} - ${ph(f.need, "Need")} - ${weekday(f.demoDate)}${
    name ? ` — logged by ${name}` : ""
  }`;

// Best-effort pre-fill from the most recently generated brief (this session).
function prefillFromBrief(): Partial<Fields> {
  try {
    const s = sessionStorage.getItem("sb:lastBrief");
    if (!s) return {};
    const b = JSON.parse(s);
    const r = b?.corrected ?? b?.result;
    const room = Array.isArray(r?.aeBrief?.room) ? r.aeBrief.room : [];
    const champ = room.find((p: { disposition?: string }) => p?.disposition === "champion") ?? room[0];
    const company = b?.company || "";
    const prospect =
      champ?.name && company ? `${champ.name} @ ${company}` : company || champ?.name || "";
    return {
      prospect,
      need: r?.aeBrief?.whyNow || r?.aeBrief?.dealSummary || "",
      aeName: b?.aeName || "",
    };
  } catch {
    return {};
  }
}

export default function DemoSetModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(() => ({
    setType: "CC",
    prospect: "",
    need: "",
    demoDate: todayISO(),
    aeName: "",
    notes: "",
    contactId: "",
    ...prefillFromBrief(),
  }));
  const [contacts, setContacts] = useState<ContactOpt[]>([]);
  // The Slack preview is derived from the fields until the rep edits it
  // directly, at which point their text takes over (override holds it).
  const [previewOverride, setPreviewOverride] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "posting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // Load the rep's profile: pre-fill the AE field when they're the AE, and
  // prefix the Slack call-out with their name.
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        if (p?.name) setUserName(p.name);
        if (p?.role === "AE" && p?.name) {
          setFields((f) => (f.aeName ? f : { ...f, aeName: p.name }));
        }
      })
      .catch(() => {});
  }, []);

  // Load CRM contacts so a demo can be linked to one (optional).
  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          setContacts(
            rows.map((c: { id: string; name: string; account?: { name?: string } | null }) => ({
              id: c.id,
              name: c.name,
              company: c.account?.name ?? null,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key: keyof Fields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const valid = () => !!fields.setType && !!fields.prospect.trim() && !!fields.demoDate;
  const busy = status !== "idle";
  const previewEdited = previewOverride !== null;
  const preview = previewOverride ?? buildPreview(fields, userName);
  // Fade the preview while it's still auto-generated and carrying placeholders.
  const previewFaded =
    !previewEdited && (preview.includes("[Prospect]") || preview.includes("[Need]"));

  async function save(): Promise<string | null> {
    if (!valid()) {
      setError("Set type, prospect, and demo date are required.");
      return null;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the demo — try again.");
        return null;
      }
      return data.id as string;
    } catch {
      setError("Couldn't save the demo — try again.");
      return null;
    } finally {
      setStatus("idle");
    }
  }

  async function logDemo() {
    const id = await save();
    if (!id) return;
    router.refresh();
    onClose();
  }

  async function logAndPost() {
    let id = savedId;
    if (!id) {
      id = await save();
      if (!id) return;
      setSavedId(id);
      router.refresh(); // demo is logged regardless of Slack outcome
    }
    setStatus("posting");
    setError(null);
    try {
      const res = await fetch(`/api/demos/${id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: preview }),
      });
      const data = await res.json();
      if (data.ok) {
        onClose();
      } else {
        setError("Demo logged — Slack delivery failed, try again.");
      }
    } catch {
      setError("Demo logged — Slack delivery failed, try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4 py-10"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-5 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Log Demo Set</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-caps mb-1.5 block">Set type</span>
              <select
                className="field"
                value={fields.setType}
                onChange={(e) => set("setType", e.target.value)}
              >
                {SET_TYPES.map((t) => (
                  <option key={t.v} value={t.v}>{t.l}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1.5 block">Demo date</span>
              <input
                type="date"
                className="field"
                value={fields.demoDate}
                onChange={(e) => set("demoDate", e.target.value)}
              />
              {fields.demoDate && (
                <span className="mt-1 block text-[11px] text-muted">
                  {longDate(fields.demoDate)}
                </span>
              )}
            </label>
          </div>

          {contacts.length > 0 && (
            <label className="block">
              <span className="label-caps mb-1.5 block">
                Link a contact <span className="normal-case text-muted">(optional)</span>
              </span>
              <select
                className="field"
                value={fields.contactId}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = contacts.find((x) => x.id === id);
                  setFields((f) => ({
                    ...f,
                    contactId: id,
                    // Auto-fill prospect from the contact when it's still empty.
                    prospect:
                      c && !f.prospect.trim()
                        ? c.company
                          ? `${c.name} @ ${c.company}`
                          : c.name
                        : f.prospect,
                  }));
                }}
              >
                <option value="">— No linked contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` · ${c.company}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="label-caps mb-1.5 block">Prospect name and/or company</span>
            <input
              className="field"
              placeholder="e.g. Dijam @ GridRaster"
              value={fields.prospect}
              onChange={(e) => set("prospect", e.target.value)}
            />
          </label>

          <label className="block">
            <span className="label-caps mb-1.5 block">Need / reason for the call</span>
            <input
              className="field"
              placeholder="e.g. Interest in CFO, wants to revisit Zeni"
              value={fields.need}
              onChange={(e) => set("need", e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-caps mb-1.5 block">
                AE it&apos;s going to <span className="normal-case text-muted">(optional)</span>
              </span>
              <input
                className="field"
                value={fields.aeName}
                onChange={(e) => set("aeName", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label-caps mb-1.5 block">
                Notes <span className="normal-case text-muted">(internal — never sent to Slack)</span>
              </span>
              <input
                className="field"
                value={fields.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
          </div>

          {/* Live, editable Slack preview */}
          <label className="block">
            <span className="label-caps mb-1.5 block">Slack message preview — edit before posting</span>
            <textarea
              className={`field resize-y font-mono text-[12.5px] ${previewFaded ? "text-muted" : ""}`}
              rows={2}
              value={preview}
              onChange={(e) => setPreviewOverride(e.target.value)}
            />
          </label>

          {error && (
            <p
              className={`text-[12px] ${
                error.startsWith("Demo logged") ? "text-coral-dark" : "text-coral-dark"
              }`}
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={logDemo} disabled={busy || !valid()}>
            {status === "saving" ? (
              <>
                <Spinner className="text-white" /> Logging…
              </>
            ) : (
              "Log Demo Set"
            )}
          </button>
          <button className="btn-secondary" onClick={logAndPost} disabled={busy || !valid()}>
            {status === "posting" ? (
              <>
                <Spinner /> Posting…
              </>
            ) : (
              "Log + Post to Slack"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
