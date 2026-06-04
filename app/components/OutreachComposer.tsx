"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Copy, Check, Send } from "lucide-react";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";
import Spinner from "./Spinner";

type ContactOpt = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  company: string | null;
  industry: string | null;
};
type Draft = { subject: string; body: string };

const KINDS = [
  { key: "cold", label: "Cold intro" },
  { key: "followup", label: "Follow-up" },
  { key: "breakup", label: "Break-up" },
] as const;

export default function OutreachComposer({ contacts }: { contacts: ContactOpt[] }) {
  const router = useRouter();
  const [contactId, setContactId] = useState("");
  const [manualName, setManualName] = useState("");
  const [kind, setKind] = useState<string>("cold");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("direct");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  const contact = contacts.find((c) => c.id === contactId) ?? null;
  const targetName = contact?.name ?? manualName.trim();

  async function generate() {
    if (!targetName) {
      setError("Pick a contact or type a name first.");
      return;
    }
    setLoading(true);
    setError(null);
    setLogged(false);
    try {
      const draft = await requestJSON<Draft>(
        "POST",
        "/api/outreach",
        {
          contactName: targetName,
          title: contact?.title ?? null,
          company: contact?.company ?? null,
          industry: contact?.industry ?? null,
          goal,
          tone,
          kind,
        },
        30000,
      );
      setSubject(draft.subject);
      setBody(draft.body);
      setHasDraft(true);
    } catch (err) {
      setError(
        err instanceof TimeoutError
          ? TIMEOUT_MSG
          : err instanceof Error
            ? err.message
            : "Couldn't draft the email — try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function logSent() {
    if (!contactId) return;
    await fetch(`/api/contacts/${contactId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "OUTREACH", subject, body }),
    }).catch(() => {});
    setLogged(true);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* Setup */}
      <section className="card h-fit space-y-4 p-5">
        <div>
          <span className="label-caps mb-1.5 block">Contact</span>
          <select
            className="field"
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              setManualName("");
            }}
          >
            <option value="">— Pick a contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </select>
          {!contactId && (
            <input
              className="field mt-2"
              placeholder="…or type a prospect name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
          )}
          {contact && (
            <p className="mt-2 text-[12px] text-muted">
              {[contact.title, contact.company, contact.industry].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div>
          <span className="label-caps mb-1.5 block">Type</span>
          <div className="inline-flex w-full gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className={`flex-1 rounded-[5px] px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                  kind === k.key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label-caps mb-1.5 block">Goal of the email</span>
          <textarea
            className="field resize-y"
            rows={3}
            placeholder="e.g. get a 15-min intro call; reference their recent funding; reconnect after no reply"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="label-caps mb-1.5 block">Tone</span>
          <select className="field" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="direct">Direct</option>
            <option value="warm">Warm</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </select>
        </label>

        {error && <p className="text-[12px] text-coral-dark">{error}</p>}

        <button className="btn-primary w-full" onClick={generate} disabled={loading}>
          {loading ? (
            <>
              <Spinner className="text-white" /> Drafting…
            </>
          ) : (
            <>
              <Sparkles size={15} /> {hasDraft ? "Regenerate" : "Draft email"}
            </>
          )}
        </button>
      </section>

      {/* Draft */}
      <section className="card flex flex-col p-5">
        {!hasDraft ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <Sparkles size={36} strokeWidth={1.4} className="text-[#c4bdb8]" />
            <p className="text-[14px] font-medium text-ink">Your draft will appear here</p>
            <p className="max-w-xs text-[13px] text-muted">
              Pick a contact, set the goal, and hit Draft email. Everything stays editable.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <label className="mb-3 block">
              <span className="label-caps mb-1.5 block">Subject</span>
              <input className="field font-medium" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="flex flex-1 flex-col">
              <span className="label-caps mb-1.5 block">Body</span>
              <textarea
                className="field flex-1 resize-y leading-relaxed"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="btn-secondary" onClick={copyAll}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy email"}
              </button>
              {contactId && (
                <button className="btn-primary" onClick={logSent} disabled={logged}>
                  <Send size={14} /> {logged ? "Logged to timeline" : "Log as sent"}
                </button>
              )}
              {!contactId && (
                <span className="text-[12px] text-muted">Pick a saved contact to log this to their timeline.</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
