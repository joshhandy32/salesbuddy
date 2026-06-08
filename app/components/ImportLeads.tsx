"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload } from "lucide-react";
import Spinner from "./Spinner";
import { parseCSV } from "@/lib/csv";

// Map a header cell to one of our fields.
const FIELD_ALIASES: Record<string, string> = {
  name: "name",
  "full name": "name",
  "first name": "name",
  contact: "name",
  email: "email",
  "email address": "email",
  title: "title",
  "job title": "title",
  role: "title",
  company: "company",
  account: "company",
  organization: "company",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  source: "source",
  "lead source": "source",
  priority: "priority",
  status: "status",
};

type ParsedRow = {
  name?: string;
  email?: string;
  title?: string;
  company?: string;
  phone?: string;
  source?: string;
  priority?: string;
  status?: string;
};

export default function ImportLeads({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo<ParsedRow[]>(() => {
    const grid = parseCSV(text);
    if (grid.length === 0) return [];
    const header = grid[0].map((h) => h.trim().toLowerCase());
    // Detect whether the first row is a header (has a recognized field name).
    const hasHeader = header.some((h) => FIELD_ALIASES[h]);
    const cols = hasHeader
      ? header.map((h) => FIELD_ALIASES[h] ?? "")
      : ["name", "email", "title", "company", "phone", "source"]; // positional fallback
    const dataRows = hasHeader ? grid.slice(1) : grid;
    return dataRows.map((cells) => {
      const r: ParsedRow = {};
      cells.forEach((cell, i) => {
        const key = cols[i];
        if (key) (r as Record<string, string>)[key] = cell.trim();
      });
      return r;
    });
  }, [text]);

  const importable = parsed.filter((r) => r.name);

  async function run() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importable }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Import failed — check your data and try again.");
        return;
      }
      onImported(d.created);
      router.refresh();
    } catch {
      setError("Import failed — try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Upload size={15} /> Import leads from CSV
        </h3>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <p className="text-[12px] text-muted">
        Paste CSV with a header row. Recognized columns: name, email, title, company, phone,
        source, priority, status. Companies are matched to accounts (created if new).
      </p>
      <textarea
        className="field resize-y font-mono text-[12px]"
        rows={7}
        placeholder={"name,email,title,company,phone,source\nJane Doe,jane@acme.com,VP Sales,Acme,555-1234,LinkedIn\nJohn Lee,john@globex.com,Director,Globex,555-9876,Referral"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {/* Preview */}
      {text.trim() && (
        <div className="rounded-input border border-line bg-page/50 px-3.5 py-2.5 text-[12px]">
          {importable.length > 0 ? (
            <>
              <span className="font-semibold text-ink">{importable.length}</span>
              <span className="text-muted"> lead{importable.length === 1 ? "" : "s"} ready</span>
              {parsed.length > importable.length && (
                <span className="text-muted"> · {parsed.length - importable.length} skipped (no name)</span>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {importable.slice(0, 6).map((r, i) => (
                  <span key={i} className="pill">
                    {r.name}
                    {r.company ? ` · ${r.company}` : ""}
                  </span>
                ))}
                {importable.length > 6 && <span className="pill text-muted">+{importable.length - 6} more</span>}
              </div>
            </>
          ) : (
            <span className="text-muted">No rows with a name detected yet.</span>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-coral-dark">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={run} disabled={importing || importable.length === 0}>
          {importing ? (
            <>
              <Spinner className="text-white" /> Importing…
            </>
          ) : (
            `Import ${importable.length || ""} lead${importable.length === 1 ? "" : "s"}`.trim()
          )}
        </button>
        <button className="btn-secondary" onClick={onClose} disabled={importing}>
          Cancel
        </button>
      </div>
    </div>
  );
}
