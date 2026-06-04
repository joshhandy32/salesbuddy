"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Phone, Mail, CheckSquare, Square, ArrowRight } from "lucide-react";

export type TaskRow = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  done: boolean;
  source: string | null;
  contactId: string | null;
  contactName: string | null;
};
type ContactOpt = { id: string; name: string };

const TYPE_ICON: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  FOLLOWUP: ArrowRight,
  TODO: CheckSquare,
};

// Bucket an open task by its due date relative to today's calendar date.
function bucketOf(dueISO: string | null): "overdue" | "today" | "upcoming" | "none" {
  if (!dueISO) return "none";
  const due = new Date(dueISO);
  const d0 = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const now = new Date();
  const t0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (d0 < t0) return "overdue";
  if (d0 === t0) return "today";
  return "upcoming";
}

const fmtDue = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const GROUPS: { key: "overdue" | "today" | "upcoming" | "none"; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "none", label: "No date" },
];

export default function Tasks({ initial, contacts }: { initial: TaskRow[]; contacts: ContactOpt[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>(initial);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);

  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const grouped = useMemo(() => {
    const m: Record<string, TaskRow[]> = { overdue: [], today: [], upcoming: [], none: [] };
    for (const t of open) m[bucketOf(t.dueDate)].push(t);
    return m;
  }, [open]);

  async function toggle(t: TaskRow) {
    setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    }).catch(() => {});
    router.refresh();
  }

  async function remove(id: string) {
    setTasks((list) => list.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{open.length}</span> open
          {grouped.overdue.length > 0 && (
            <span className="text-coral-dark"> · {grouped.overdue.length} overdue</span>
          )}
        </span>
        <button className="btn-primary" onClick={() => setAdding((v) => !v)}>
          <Plus size={15} /> Add task
        </button>
      </div>

      {adding && (
        <TaskForm
          contacts={contacts}
          onCancel={() => setAdding(false)}
          onSaved={(t) => {
            setTasks((list) => [t, ...list]);
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      {open.length === 0 && !adding ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <CheckSquare size={40} strokeWidth={1.4} className="text-[#c4bdb8]" />
          <p className="text-[15px] font-semibold text-ink">You&apos;re all caught up</p>
          <p className="max-w-sm text-[13px] text-muted">No open tasks. Add a follow-up to stay on top of your leads.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {GROUPS.map(({ key, label }) =>
            grouped[key].length === 0 ? null : (
              <section key={key}>
                <h2
                  className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] ${
                    key === "overdue" ? "text-coral-dark" : "text-muted"
                  }`}
                >
                  {label} ({grouped[key].length})
                </h2>
                <div className="card divide-y divide-line/60">
                  {grouped[key].map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => remove(t.id)} />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <section>
          <button
            className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted hover:text-ink"
            onClick={() => setShowDone((s) => !s)}
          >
            Completed ({done.length}) {showDone ? "▾" : "▸"}
          </button>
          {showDone && (
            <div className="card divide-y divide-line/60">
              {done.slice(0, 50).map((t) => (
                <TaskItem key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => remove(t.id)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskRow;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const I = TYPE_ICON[task.type] ?? ArrowRight;
  const overdue = !task.done && bucketOf(task.dueDate) === "overdue";
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5">
      <button onClick={onToggle} className="shrink-0 text-muted hover:text-coral" aria-label={task.done ? "Mark incomplete" : "Mark complete"}>
        {task.done ? <CheckSquare size={18} className="text-success" /> : <Square size={18} />}
      </button>
      <I size={14} className="shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <span className={`text-[14px] ${task.done ? "text-muted line-through" : "text-ink"}`}>{task.title}</span>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          {task.contactId && (
            <Link href={`/contacts/${task.contactId}`} className="hover:text-ink hover:underline">
              {task.contactName}
            </Link>
          )}
          {task.source && <span className="rounded bg-page px-1.5 text-[11px]">{task.source}</span>}
        </div>
      </div>
      {task.dueDate && (
        <span className={`shrink-0 text-[12px] ${overdue ? "font-semibold text-coral-dark" : "text-muted"}`}>
          {fmtDue(task.dueDate)}
        </span>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 text-muted opacity-0 transition-opacity hover:text-coral-dark group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function TaskForm({
  contacts,
  onCancel,
  onSaved,
}: {
  contacts: ContactOpt[];
  onCancel: () => void;
  onSaved: (t: TaskRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("FOLLOWUP");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, dueDate: dueDate || null, contactId: contactId || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Couldn't save — try again.");
        return;
      }
      const row = await res.json();
      onSaved({
        id: row.id,
        title: row.title,
        type: row.type,
        dueDate: row.dueDate ?? null,
        done: row.done,
        source: row.source,
        contactId: row.contactId,
        contactName: row.contact?.name ?? null,
      });
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <input
        className="field"
        placeholder="What needs doing? e.g. Follow up with Jane on pricing"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="FOLLOWUP">Follow-up</option>
          <option value="CALL">Call</option>
          <option value="EMAIL">Email</option>
          <option value="TODO">To-do</option>
        </select>
        <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <select className="field" value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">— No contact —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Add task"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
