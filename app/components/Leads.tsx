"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Pencil, X, PhoneCall, Send, TrendingUp } from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_SOURCES,
  PRIORITIES,
} from "@/lib/crm";

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  source: string | null;
  priority: string;
  accountId: string | null;
  accountName: string | null;
  notes: string | null;
  lastTouchedAt: string | null;
  createdAt: string;
};
type AccountOpt = { id: string; name: string };

const STATUS_PILL: Record<string, string> = {
  NEW: "pill",
  WORKING: "pill pill-teal",
  QUALIFIED: "pill pill-teal",
  UNQUALIFIED: "pill",
  CUSTOMER: "pill pill-coral",
};
const PRIORITY_DOT: Record<string, string> = { HIGH: "#eb7360", MEDIUM: "#d97706", LOW: "#99a1af" };

function touchedLabel(iso: string | null): string {
  if (!iso) return "Never touched";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Touched today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return "30+ days ago";
}

export default function Leads({ initial, accounts }: { initial: Lead[]; accounts: AccountOpt[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [tab, setTab] = useState<"ALL" | string>("ALL");
  const [priority, setPriority] = useState<"ALL" | string>("ALL");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leads) m[l.status] = (m[l.status] ?? 0) + 1;
    return m;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (tab === "ALL" || l.status === tab) &&
        (priority === "ALL" || l.priority === priority) &&
        (!q ||
          (l.name + " " + (l.title ?? "") + " " + (l.accountName ?? "") + " " + (l.email ?? ""))
            .toLowerCase()
            .includes(q)),
    );
  }, [leads, tab, priority, query]);

  async function patch(id: string, body: Record<string, unknown>) {
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, ...body } : l)));
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    router.refresh();
  }

  async function remove(id: string) {
    setLeads((list) => list.filter((l) => l.id !== id));
    await fetch(`/api/contacts/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  async function logTouch(l: Lead, type: "CALL" | "OUTREACH") {
    setLeads((list) =>
      list.map((x) => (x.id === l.id ? { ...x, lastTouchedAt: new Date().toISOString() } : x)),
    );
    await fetch(`/api/contacts/${l.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subject: type === "CALL" ? "Call logged" : "Outreach sent" }),
    }).catch(() => {});
    showToast(type === "CALL" ? "Call logged" : "Outreach logged");
    router.refresh();
  }

  async function convert(l: Lead) {
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${l.accountName || l.name} — opportunity`,
        accountId: l.accountId,
        contactId: l.id,
        stage: "DISCOVERY",
      }),
    }).catch(() => null);
    if (res && res.ok) {
      await patch(l.id, { status: "QUALIFIED" });
      showToast("Deal created in pipeline");
    } else {
      showToast("Couldn't create deal — try again.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
          <Tab active={tab === "ALL"} onClick={() => setTab("ALL")}>
            All <span className="text-muted">{leads.length}</span>
          </Tab>
          {LEAD_STATUSES.map((s) => (
            <Tab key={s} active={tab === s} onClick={() => setTab(s)}>
              {LEAD_STATUS_LABEL[s]} <span className="text-muted">{counts[s] ?? 0}</span>
            </Tab>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} /> Add lead
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-input border border-line bg-white px-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads by name, title, company, email…"
            className="h-10 w-full border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            style={{ boxShadow: "none" }}
          />
        </div>
        <select
          className="field !h-10 w-36"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p[0] + p.slice(1).toLowerCase()} priority
            </option>
          ))}
        </select>
      </div>

      {editing && (
        <LeadForm
          lead={editing === "new" ? null : editing}
          accounts={accounts}
          onCancel={() => setEditing(null)}
          onSaved={(l, isNew) => {
            setLeads((list) => (isNew ? [l, ...list] : list.map((x) => (x.id === l.id ? l : x))));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
          </p>
          <p className="max-w-sm text-[13px] text-muted">
            {leads.length === 0
              ? "Add your first lead to start working your list."
              : "Try a different status, priority, or search."}
          </p>
          {leads.length === 0 && (
            <button className="btn-primary mt-1" onClick={() => setEditing("new")}>
              <Plus size={15} /> Add lead
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="label-caps py-2.5 pl-4 pr-3 font-semibold">Lead</th>
                <th className="label-caps py-2.5 pr-3 font-semibold">Company</th>
                <th className="label-caps py-2.5 pr-3 font-semibold">Source</th>
                <th className="label-caps py-2.5 pr-3 font-semibold">Status</th>
                <th className="label-caps py-2.5 pr-3 font-semibold">Last touch</th>
                <th className="label-caps py-2.5 pr-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-line/60 align-middle">
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: PRIORITY_DOT[l.priority] ?? "#99a1af" }}
                        title={`${l.priority[0] + l.priority.slice(1).toLowerCase()} priority`}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">{l.name}</div>
                        {l.title && <div className="text-[12px] text-muted">{l.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-body">{l.accountName ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    {l.source ? <span className="pill">{l.source}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      className={`${STATUS_PILL[l.status] ?? "pill"} cursor-pointer !border-0 bg-transparent !px-0 text-[12px] font-semibold`}
                      value={l.status}
                      onChange={(e) => patch(l.id, { status: e.target.value })}
                      style={{ appearance: "none" }}
                      title="Change status"
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {LEAD_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-[12px] text-muted">
                    {touchedLabel(l.lastTouchedAt)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Log call" onClick={() => logTouch(l, "CALL")}>
                        <PhoneCall size={14} />
                      </IconBtn>
                      <IconBtn title="Log outreach" onClick={() => logTouch(l, "OUTREACH")}>
                        <Send size={14} />
                      </IconBtn>
                      <IconBtn title="Convert to deal" onClick={() => convert(l)}>
                        <TrendingUp size={14} />
                      </IconBtn>
                      <IconBtn title="Edit" onClick={() => setEditing(l)}>
                        <Pencil size={13} />
                      </IconBtn>
                      <IconBtn title="Delete" danger onClick={() => remove(l.id)}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="animate-toast fixed bottom-5 right-5 z-[70] rounded-input bg-navy px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[5px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-[4px] p-1.5 text-muted transition-colors hover:bg-page ${
        danger ? "hover:text-coral-dark" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function LeadForm({
  lead,
  accounts,
  onCancel,
  onSaved,
}: {
  lead: Lead | null;
  accounts: AccountOpt[];
  onCancel: () => void;
  onSaved: (l: Lead, isNew: boolean) => void;
}) {
  const [f, setF] = useState({
    name: lead?.name ?? "",
    title: lead?.title ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    accountId: lead?.accountId ?? "",
    source: lead?.source ?? "",
    priority: lead?.priority ?? "MEDIUM",
    status: lead?.status ?? "NEW",
    notes: lead?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = !lead;
      const res = await fetch(isNew ? "/api/contacts" : `/api/contacts/${lead!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save — try again.");
        return;
      }
      const row = await res.json();
      onSaved(
        {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          title: row.title,
          status: row.status,
          source: row.source,
          priority: row.priority,
          accountId: row.accountId,
          accountName: row.account?.name ?? null,
          notes: row.notes,
          lastTouchedAt: row.lastTouchedAt ?? null,
          createdAt: row.createdAt,
        },
        isNew,
      );
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">{lead ? "Edit lead" : "New lead"}</h3>
        <button onClick={onCancel} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Name">
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
        </Labeled>
        <Labeled label="Title">
          <input className="field" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="VP Sales" />
        </Labeled>
        <Labeled label="Email">
          <input className="field" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@company.com" />
        </Labeled>
        <Labeled label="Phone">
          <input className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" />
        </Labeled>
        <Labeled label="Company">
          <select className="field" value={f.accountId} onChange={(e) => set("accountId", e.target.value)}>
            <option value="">— No company —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Source">
          <select className="field" value={f.source} onChange={(e) => set("source", e.target.value)}>
            <option value="">— Source —</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Priority">
          <select className="field" value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0] + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Status">
          <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Labeled>
      </div>
      <Labeled label="Notes">
        <textarea
          className="field resize-y"
          rows={2}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Context, pain points, next step…"
        />
      </Labeled>
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : lead ? "Save changes" : "Add lead"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
