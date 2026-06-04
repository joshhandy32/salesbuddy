"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Building2, Users, TrendingUp } from "lucide-react";

export type AccountRow = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  ownerName: string | null;
  notes: string | null;
  contacts: number;
  deals: number;
};

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export default function Accounts({ initial }: { initial: AccountRow[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>(initial);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(
      (a) => !q || (a.name + " " + (a.industry ?? "") + " " + (a.domain ?? "")).toLowerCase().includes(q),
    );
  }, [accounts, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-input border border-line bg-white px-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="h-10 w-full border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            style={{ boxShadow: "none" }}
          />
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add account
        </button>
      </div>

      {adding && (
        <AccountForm
          onCancel={() => setAdding(false)}
          onSaved={(a) => {
            setAccounts((list) => [...list, a].sort((x, y) => x.name.localeCompare(y.name)));
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Building2 size={42} strokeWidth={1.4} className="text-[#c4bdb8]" />
          <p className="text-[15px] font-semibold text-ink">
            {accounts.length === 0 ? "No accounts yet" : "No accounts match your search"}
          </p>
          {accounts.length === 0 && (
            <button className="btn-primary mt-1" onClick={() => setAdding(true)}>
              <Plus size={15} /> Add account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((a) => (
            <Link
              key={a.id}
              href={`/accounts/${a.id}`}
              className="card flex flex-col p-4 transition-colors hover:border-coral/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{a.name}</div>
                  <div className="text-[12px] text-muted">
                    {[a.industry, a.size && `${a.size} employees`].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Building2 size={18} className="shrink-0 text-muted" />
              </div>
              <div className="mt-3 flex items-center gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Users size={13} /> {a.contacts} contact{a.contacts === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={13} /> {a.deals} deal{a.deals === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (a: AccountRow) => void;
}) {
  const [f, setF] = useState({ name: "", industry: "", size: "", domain: "", website: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) {
      setError("Account name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save — try again.");
        return;
      }
      const row = await res.json();
      onSaved({ ...row, contacts: 0, deals: 0 });
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">New account</h3>
        <button onClick={onCancel} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Name">
          <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Inc" />
        </L>
        <L label="Industry">
          <input className="field" value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="SaaS" />
        </L>
        <L label="Size">
          <select className="field" value={f.size} onChange={(e) => set("size", e.target.value)}>
            <option value="">— Headcount —</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </L>
        <L label="Website">
          <input className="field" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.com" />
        </L>
      </div>
      <L label="Notes">
        <textarea className="field resize-y" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </L>
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Add account"}
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
