"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Pencil, X, BookOpen } from "lucide-react";
import CopyButton from "./CopyButton";
import Spinner from "./Spinner";

export type Snippet = { id: string; category: string; title: string; body: string };

const CATEGORIES = [
  { key: "OBJECTION", label: "Objections" },
  { key: "OPENER", label: "Openers" },
  { key: "VOICEMAIL", label: "Voicemails" },
  { key: "EMAIL", label: "Emails" },
] as const;
type CatKey = (typeof CATEGORIES)[number]["key"];

const catLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? k;
const CAT_PILL: Record<string, string> = {
  OBJECTION: "pill-coral",
  OPENER: "pill-teal",
  VOICEMAIL: "pill",
  EMAIL: "pill",
};

// One-click starter content so the Playbook is useful before the rep adds their
// own. These are inserted as real, editable snippets — not hard-coded.
const STARTERS: { category: CatKey; title: string; body: string }[] = [
  {
    category: "OBJECTION",
    title: "“Just send me an email”",
    body: "Happy to. So I send the right thing and not just another email you delete, what's the one problem worth me addressing? If it's not relevant I'll leave you alone.",
  },
  {
    category: "OBJECTION",
    title: "“We already have a solution”",
    body: "Most people I talk to do. I'm not asking you to rip anything out. Teams usually look at us when [specific gap] starts costing them. Is that on your radar at all, or fully handled?",
  },
  {
    category: "OBJECTION",
    title: "“I'm not interested”",
    body: "Totally fair, you don't know me yet. Quick gut check: if I could show you how [peer company] cut [metric] by [X], worth 15 minutes? If not, no hard feelings.",
  },
  {
    category: "OBJECTION",
    title: "“No budget right now”",
    body: "Understood, and I'm not here to push a PO today. Worth a look so when budget frees up you already know if we're a fit. What would have to be true for this to earn a line next quarter?",
  },
  {
    category: "OPENER",
    title: "Permission-based cold open",
    body: "Hey [name], you weren't expecting my call so I'll be quick. I'm with [company] and I have a reason for reaching out. Can I take 30 seconds and you tell me if I'm off base?",
  },
  {
    category: "VOICEMAIL",
    title: "15-second voicemail",
    body: "Hi [name], it's [you] at [company]. I'm calling about [specific trigger] at [their company]. I'll follow up by email, but if it's easier, I'm at [number]. Talk soon.",
  },
  {
    category: "EMAIL",
    title: "Break-up email",
    body: "Subject: closing the loop\n\n[name], I've reached out a few times about [problem] and haven't heard back, so I'll assume the timing's off. If that changes, you know where to find me. Wishing you a strong quarter.",
  },
];

export default function Playbook({ initial }: { initial: Snippet[] }) {
  const router = useRouter();
  const [snippets, setSnippets] = useState<Snippet[]>(initial);
  const [tab, setTab] = useState<"ALL" | CatKey>("ALL");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Snippet | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of snippets) m[s.category] = (m[s.category] ?? 0) + 1;
    return m;
  }, [snippets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snippets.filter(
      (s) =>
        (tab === "ALL" || s.category === tab) &&
        (!q || (s.title + " " + s.body).toLowerCase().includes(q)),
    );
  }, [snippets, tab, query]);

  async function remove(id: string) {
    setSnippets((list) => list.filter((s) => s.id !== id));
    await fetch(`/api/snippets/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  async function addStarters() {
    setBusy(true);
    try {
      const created: Snippet[] = [];
      for (const s of STARTERS) {
        const res = await fetch("/api/snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        if (res.ok) created.push(await res.json());
      }
      setSnippets((list) => [...created, ...list]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[6px] bg-warm-100 p-[3px]">
          <TabBtn active={tab === "ALL"} onClick={() => setTab("ALL")}>
            All <span className="text-muted">{snippets.length}</span>
          </TabBtn>
          {CATEGORIES.map((c) => (
            <TabBtn key={c.key} active={tab === c.key} onClick={() => setTab(c.key)}>
              {c.label} <span className="text-muted">{counts[c.key] ?? 0}</span>
            </TabBtn>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={15} /> Add snippet
        </button>
      </div>

      <div className="flex items-center gap-2.5 rounded-input border border-line bg-white px-3">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the playbook…"
          className="h-10 w-full border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          style={{ boxShadow: "none" }}
        />
      </div>

      {editing && (
        <SnippetForm
          snippet={editing === "new" ? null : editing}
          defaultCategory={tab === "ALL" ? "OBJECTION" : tab}
          onCancel={() => setEditing(null)}
          onSaved={(s, isNew) => {
            setSnippets((list) => (isNew ? [s, ...list] : list.map((x) => (x.id === s.id ? s : x))));
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        snippets.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <BookOpen size={42} strokeWidth={1.4} className="text-[#c4bdb8]" />
            <p className="text-[15px] font-semibold text-ink">Your playbook is empty</p>
            <p className="max-w-sm text-[13px] text-muted">
              Add your best lines, or drop in a starter pack of proven objection
              rebuttals, openers, a voicemail, and a break-up email to edit and make your own.
            </p>
            <button className="btn-primary mt-1" onClick={addStarters} disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="text-white" /> Adding…
                </>
              ) : (
                "Add starter pack"
              )}
            </button>
          </div>
        ) : (
          <p className="card px-6 py-12 text-center text-[13px] text-muted">
            No snippets match “{query}”.
          </p>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <div key={s.id} className="card flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`pill ${CAT_PILL[s.category] ?? "pill"}`}>{catLabel(s.category)}</span>
                  <h3 className="text-[14px] font-semibold text-ink">{s.title}</h3>
                </div>
                <div className="flex shrink-0 items-center">
                  <CopyButton text={s.body} label="" />
                  <button
                    onClick={() => setEditing(s)}
                    className="rounded-[4px] p-1 text-muted transition-colors hover:text-ink"
                    aria-label="Edit snippet"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-[4px] p-1 text-muted transition-colors hover:text-coral-dark"
                    aria-label="Delete snippet"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-body">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function SnippetForm({
  snippet,
  defaultCategory,
  onCancel,
  onSaved,
}: {
  snippet: Snippet | null;
  defaultCategory: CatKey;
  onCancel: () => void;
  onSaved: (s: Snippet, isNew: boolean) => void;
}) {
  const [category, setCategory] = useState<string>(snippet?.category ?? defaultCategory);
  const [title, setTitle] = useState(snippet?.title ?? "");
  const [body, setBody] = useState(snippet?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = !snippet;
      const res = await fetch(isNew ? "/api/snippets" : `/api/snippets/${snippet!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save — try again.");
        return;
      }
      onSaved((await res.json()) as Snippet, isNew);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">{snippet ? "Edit snippet" : "New snippet"}</h3>
        <button onClick={onCancel} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          className="field"
          placeholder="Title — e.g. “Send me an email”"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <textarea
        className="field resize-y"
        rows={4}
        placeholder="The line, script, or snippet…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : snippet ? "Save changes" : "Add snippet"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
