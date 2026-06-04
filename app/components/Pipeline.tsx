"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABEL,
  OPEN_STAGES,
  isOpenStage,
  pipelineSummary,
  money,
} from "@/lib/crm";

export type DealRow = {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  accountId: string | null;
  accountName: string | null;
  contactId: string | null;
  contactName: string | null;
  notes: string | null;
};
type Opt = { id: string; name: string };

const STAGE_ACCENT: Record<string, string> = {
  NEW: "#94a3b8",
  DISCOVERY: "#2b7fff",
  DEMO: "#00a877",
  PROPOSAL: "#d97706",
  NEGOTIATION: "#eb7360",
};

export default function Pipeline({
  initial,
  accounts,
  contacts,
}: {
  initial: DealRow[];
  accounts: Opt[];
  contacts: Opt[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>(initial);
  const [editing, setEditing] = useState<DealRow | "new" | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const summary = useMemo(() => pipelineSummary(deals), [deals]);
  const byStage = useMemo(() => {
    const m: Record<string, DealRow[]> = {};
    for (const s of DEAL_STAGES) m[s] = [];
    for (const d of deals) (m[d.stage] ??= []).push(d);
    return m;
  }, [deals]);

  async function move(id: string, stage: string) {
    setDeals((list) => list.map((d) => (d.id === id ? { ...d, stage } : d)));
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch(() => {});
    router.refresh();
  }

  async function remove(id: string) {
    setDeals((list) => list.filter((d) => d.id !== id));
    await fetch(`/api/deals/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  const closed = deals.filter((d) => !isOpenStage(d.stage));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open deals" value={String(summary.openCount)} />
        <Stat label="Open value" value={money(summary.openValue)} />
        <Stat label="Weighted value" value={money(summary.weightedValue)} accent />
        <Stat label="Won value" value={money(summary.wonValue)} />
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} /> Add deal
        </button>
      </div>

      {editing && (
        <DealForm
          deal={editing === "new" ? null : editing}
          accounts={accounts}
          contacts={contacts}
          onCancel={() => setEditing(null)}
          onSaved={(d, isNew) => {
            setDeals((list) => (isNew ? [d, ...list] : list.map((x) => (x.id === d.id ? d : x))));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPEN_STAGES.map((stage) => {
          const col = byStage[stage] ?? [];
          const total = col.reduce((s, d) => s + (d.amount || 0), 0);
          return (
            <div key={stage} className="flex w-72 shrink-0 flex-col">
              <div className="mb-2 flex items-center justify-between border-b-2 pb-1.5" style={{ borderColor: STAGE_ACCENT[stage] }}>
                <span className="text-[13px] font-semibold text-ink">{DEAL_STAGE_LABEL[stage]}</span>
                <span className="text-[12px] text-muted">
                  {col.length} · {money(total)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {col.length === 0 && (
                  <p className="rounded-input border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">
                    No deals
                  </p>
                )}
                {col.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    onMove={move}
                    onEdit={() => setEditing(d)}
                    onDelete={() => remove(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed deals */}
      {closed.length > 0 && (
        <section className="card p-5">
          <button
            className="flex w-full items-center justify-between text-[14px] font-semibold text-ink"
            onClick={() => setShowClosed((s) => !s)}
          >
            <span>Closed deals ({closed.length})</span>
            <span className="text-[12px] font-normal text-muted">{showClosed ? "Hide" : "Show"}</span>
          </button>
          {showClosed && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <tbody>
                  {closed.map((d) => (
                    <tr key={d.id} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{d.name}</td>
                      <td className="py-2 pr-3 text-muted">{d.accountName ?? "—"}</td>
                      <td className="py-2 pr-3 text-body">{money(d.amount)}</td>
                      <td className="py-2 pr-3">
                        <span className={`pill ${d.stage === "CLOSED_WON" ? "pill-teal" : "pill-coral"}`}>
                          {DEAL_STAGE_LABEL[d.stage]}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <select
                          className="field !h-7 w-32 !py-0 text-[12px]"
                          value={d.stage}
                          onChange={(e) => move(d.id, e.target.value)}
                        >
                          {DEAL_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {DEAL_STAGE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="label-caps mb-1.5">{label}</div>
      <div className={`text-[22px] font-bold leading-none ${accent ? "text-coral-dark" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  onMove,
  onEdit,
  onDelete,
}: {
  deal: DealRow;
  onMove: (id: string, stage: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const idx = OPEN_STAGES.indexOf(deal.stage as (typeof OPEN_STAGES)[number]);
  const prev = idx > 0 ? OPEN_STAGES[idx - 1] : null;
  const next = idx >= 0 && idx < OPEN_STAGES.length - 1 ? OPEN_STAGES[idx + 1] : "PROPOSAL";
  const nextStage = idx === OPEN_STAGES.length - 1 ? "CLOSED_WON" : OPEN_STAGES[idx + 1];

  return (
    <div className="rounded-input border border-line bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <button onClick={onEdit} className="text-left text-[13px] font-semibold text-ink hover:text-coral-dark">
          {deal.name}
        </button>
        <button onClick={onDelete} className="shrink-0 text-muted hover:text-coral-dark" aria-label="Delete deal">
          <Trash2 size={12} />
        </button>
      </div>
      {deal.accountName && <div className="text-[12px] text-muted">{deal.accountName}</div>}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-ink">{money(deal.amount)}</span>
        <div className="flex items-center gap-1">
          {prev && (
            <button
              onClick={() => onMove(deal.id, prev)}
              className="rounded p-1 text-muted hover:bg-page hover:text-ink"
              title={`Back to ${DEAL_STAGE_LABEL[prev]}`}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <button
            onClick={() => onMove(deal.id, nextStage ?? next)}
            className="rounded p-1 text-muted hover:bg-page hover:text-ink"
            title={`Advance to ${DEAL_STAGE_LABEL[nextStage ?? "PROPOSAL"]}`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DealForm({
  deal,
  accounts,
  contacts,
  onCancel,
  onSaved,
}: {
  deal: DealRow | null;
  accounts: Opt[];
  contacts: Opt[];
  onCancel: () => void;
  onSaved: (d: DealRow, isNew: boolean) => void;
}) {
  const [f, setF] = useState({
    name: deal?.name ?? "",
    accountId: deal?.accountId ?? "",
    contactId: deal?.contactId ?? "",
    stage: deal?.stage ?? "NEW",
    amount: deal?.amount != null ? String(deal.amount) : "",
    closeDate: deal?.closeDate ? deal.closeDate.slice(0, 10) : "",
    notes: deal?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) {
      setError("Deal name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = !deal;
      const res = await fetch(isNew ? "/api/deals" : `/api/deals/${deal!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          amount: Number(f.amount) || 0,
          closeDate: f.closeDate || null,
        }),
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
          stage: row.stage,
          amount: row.amount,
          closeDate: row.closeDate ?? null,
          accountId: row.accountId,
          accountName: row.account?.name ?? null,
          contactId: row.contactId,
          contactName: row.contact?.name ?? null,
          notes: row.notes,
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
        <h3 className="text-[14px] font-semibold text-ink">{deal ? "Edit deal" : "New deal"}</h3>
        <button onClick={onCancel} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Deal name">
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme — annual plan" />
        </L>
        <L label="Amount ($)">
          <input className="field" type="number" min={0} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="25000" />
        </L>
        <L label="Company">
          <select className="field" value={f.accountId} onChange={(e) => set("accountId", e.target.value)}>
            <option value="">— No company —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </L>
        <L label="Contact">
          <select className="field" value={f.contactId} onChange={(e) => set("contactId", e.target.value)}>
            <option value="">— No contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </L>
        <L label="Stage">
          <select className="field" value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>{DEAL_STAGE_LABEL[s]}</option>
            ))}
          </select>
        </L>
        <L label="Close date">
          <input className="field" type="date" value={f.closeDate} onChange={(e) => set("closeDate", e.target.value)} />
        </L>
      </div>
      <L label="Notes">
        <textarea className="field resize-y" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </L>
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : deal ? "Save changes" : "Add deal"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
