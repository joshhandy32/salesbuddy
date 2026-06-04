"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  PhoneCall,
  Send,
  StickyNote,
  FileText,
  ArrowRightCircle,
} from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, DEAL_STAGE_LABEL, money } from "@/lib/crm";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  source: string | null;
  priority: string;
  notes: string | null;
  accountId: string | null;
  accountName: string | null;
  lastTouchedAt: string | null;
};
type Deal = { id: string; name: string; stage: string; amount: number };
type Activity = { id: string; type: string; subject: string | null; body: string | null; createdAt: string };

const ACT_ICON: Record<string, typeof Mail> = {
  EMAIL: Mail,
  OUTREACH: Send,
  CALL: PhoneCall,
  NOTE: StickyNote,
  STAGE: ArrowRightCircle,
};
const ACT_LABEL: Record<string, string> = {
  EMAIL: "Email",
  OUTREACH: "Outreach",
  CALL: "Call",
  NOTE: "Note",
  STAGE: "Stage change",
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function ContactDetail({
  contact,
  deals,
  activities: initialActivities,
}: {
  contact: Contact;
  deals: Deal[];
  activities: Activity[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(contact.status);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [logType, setLogType] = useState("NOTE");
  const [logText, setLogText] = useState("");
  const [saving, setSaving] = useState(false);

  async function changeStatus(s: string) {
    setStatus(s);
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    }).catch(() => {});
    router.refresh();
  }

  async function logActivity() {
    if (!logText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: logType, subject: ACT_LABEL[logType], body: logText.trim() }),
      });
      if (res.ok) {
        const a = await res.json();
        setActivities((list) => [a, ...list]);
        setLogText("");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to leads
      </Link>

      {/* Header */}
      <header className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral text-[15px] font-bold text-white">
              {contact.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">{contact.name}</h1>
              <p className="mt-0.5 text-[13px] text-muted">
                {[contact.title, contact.source && `via ${contact.source}`].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 text-link hover:underline">
                    <Mail size={13} /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <span className="inline-flex items-center gap-1.5 text-body">
                    <Phone size={13} /> {contact.phone}
                  </span>
                )}
                {contact.accountId && (
                  <Link href={`/accounts/${contact.accountId}`} className="inline-flex items-center gap-1.5 text-link hover:underline">
                    <Building2 size={13} /> {contact.accountName}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <label className="block">
            <span className="label-caps mb-1.5 block">Status</span>
            <select className="field !h-9 w-40" value={status} onChange={(e) => changeStatus(e.target.value)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {contact.notes && (
          <p className="mt-4 rounded-input bg-page/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-body">
            {contact.notes}
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Activity */}
        <section className="card p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Activity</h2>

          {/* Log form */}
          <div className="mb-4 rounded-input border border-line p-3">
            <div className="mb-2 flex gap-2">
              {(["NOTE", "CALL", "EMAIL", "OUTREACH"] as const).map((t) => {
                const I = ACT_ICON[t];
                return (
                  <button
                    key={t}
                    onClick={() => setLogType(t)}
                    className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                      logType === t ? "bg-coral-bg text-coral-dark" : "text-muted hover:bg-page"
                    }`}
                  >
                    <I size={13} /> {ACT_LABEL[t]}
                  </button>
                );
              })}
            </div>
            <textarea
              className="field resize-y"
              rows={2}
              placeholder={`Log a ${ACT_LABEL[logType].toLowerCase()}…`}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
            />
            <div className="mt-2">
              <button className="btn-primary !h-8" onClick={logActivity} disabled={saving || !logText.trim()}>
                {saving ? "Logging…" : "Log activity"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          {activities.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No activity logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => {
                const I = ACT_ICON[a.type] ?? FileText;
                return (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-muted">
                      <I size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink">{a.subject || ACT_LABEL[a.type] || "Activity"}</span>
                        <span className="shrink-0 text-[11px] text-muted">{fmtWhen(a.createdAt)}</span>
                      </div>
                      {a.body && <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-body">{a.body}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Deals */}
        <section className="card h-fit p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Deals ({deals.length})</h2>
          {deals.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No deals linked yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{d.name}</div>
                    <div className="text-[12px] text-muted">{money(d.amount)}</div>
                  </div>
                  <span className="pill shrink-0">{DEAL_STAGE_LABEL[d.stage] ?? d.stage}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
