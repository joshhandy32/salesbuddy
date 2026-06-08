// Orum dialer analytics export → Pacing Calculator metrics.
// Client-safe: pure parsing + mapping. The PNG/vision path lives server-side
// (lib has no Anthropic import here) but reuses these types and the row mapping.

import { parseCSV } from "./csv";

// One parsed Orum row (per rep, or the Total row).
export type OrumRow = {
  repName: string;
  dials: number;
  dialToConnect: number; // fraction
  bridgedToConnect: number; // fraction
  outboundConnects: number;
  connectToConversation: number; // fraction
  conversations: number;
  conversationToMeeting: number; // fraction
  meetings: number;
  callbacks: number;
  callbackToConnect: number; // fraction
  callbackConnects: number;
  dialTime: number; // seconds
  talkTime: number; // seconds
  pauseTime: number; // seconds
  sessionTime: number; // seconds
  isTotal: boolean;
};

export type OrumReport = {
  rows: OrumRow[]; // per-rep rows (Total excluded here)
  total: OrumRow | null;
};

// Header aliases → canonical key. Lowercased, trimmed match so column order or
// minor capitalization changes don't break parsing.
const HEADER_MAP: Record<string, keyof OrumRow> = {
  "rep name": "repName",
  rep: "repName",
  name: "repName",
  dials: "dials",
  "dial to connect": "dialToConnect",
  "bridged to connect": "bridgedToConnect",
  "outbound connects": "outboundConnects",
  "connect to conversation": "connectToConversation",
  conversations: "conversations",
  "conversation to meeting": "conversationToMeeting",
  meetings: "meetings",
  callbacks: "callbacks",
  "callback to connect": "callbackToConnect",
  "callback connects": "callbackConnects",
  "dial time": "dialTime",
  "talk time": "talkTime",
  "pause time": "pauseTime",
  "session time": "sessionTime",
};

const NUM_KEYS = new Set<keyof OrumRow>([
  "dials",
  "dialToConnect",
  "bridgedToConnect",
  "outboundConnects",
  "connectToConversation",
  "conversations",
  "conversationToMeeting",
  "meetings",
  "callbacks",
  "callbackToConnect",
  "callbackConnects",
  "dialTime",
  "talkTime",
  "pauseTime",
  "sessionTime",
]);

function emptyRow(): OrumRow {
  return {
    repName: "",
    dials: 0,
    dialToConnect: 0,
    bridgedToConnect: 0,
    outboundConnects: 0,
    connectToConversation: 0,
    conversations: 0,
    conversationToMeeting: 0,
    meetings: 0,
    callbacks: 0,
    callbackToConnect: 0,
    callbackConnects: 0,
    dialTime: 0,
    talkTime: 0,
    pauseTime: 0,
    sessionTime: 0,
    isTotal: false,
  };
}

// Parse a number cell: strips %, $, commas, whitespace. A trailing % is treated
// as a percentage and converted to a fraction (defensive — raw exports use
// fractions, but a copy-paste from the UI may include %).
function parseNum(raw: string): number {
  const s = raw.trim();
  if (!s) return 0;
  const hasPct = s.includes("%");
  const cleaned = s.replace(/[%$,\s]/g, "");
  const n = Number(cleaned);
  if (!isFinite(n)) return 0;
  return hasPct ? n / 100 : n;
}

/**
 * Parse the Orum "Download CSV (raw data)" export. Maps columns by header name,
 * so it tolerates added/reordered columns. Returns per-rep rows plus the Total.
 */
export function parseOrumCSV(text: string): OrumReport {
  const grid = parseCSV(text);
  if (grid.length < 2) return { rows: [], total: null };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const keys = header.map((h) => HEADER_MAP[h] ?? null);
  // Must look like an Orum export (has a dials column and a meetings column).
  if (!keys.includes("dials") || !keys.includes("meetings")) {
    return { rows: [], total: null };
  }

  const parsed: OrumRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const row = emptyRow();
    keys.forEach((key, i) => {
      if (!key) return;
      const cell = cells[i] ?? "";
      if (key === "repName") row.repName = cell.trim();
      else if (NUM_KEYS.has(key)) (row[key] as number) = parseNum(cell);
    });
    row.isTotal = row.repName.trim().toLowerCase() === "total";
    // Skip fully empty rows.
    if (!row.repName && row.dials === 0 && row.meetings === 0) continue;
    parsed.push(row);
  }

  const total = parsed.find((r) => r.isTotal) ?? null;
  const rows = parsed.filter((r) => !r.isTotal);
  return { rows, total };
}

// ── Mapping into the Pacing Calculator's Historical fields ────────────────────
// Core funnel: Dials → Outbound connects → Conversations → Meetings (Orum-set
// demos). These four fields are not touched by the pacing page's demo auto-sync,
// so importing them is safe.
export type HistoricalPatch = {
  dials: number;
  connects: number;
  conversations: number;
  orumDemoSets: number;
};

export function mapToHistorical(row: OrumRow): HistoricalPatch {
  return {
    dials: Math.round(row.dials),
    connects: Math.round(row.outboundConnects),
    conversations: Math.round(row.conversations),
    orumDemoSets: Math.round(row.meetings),
  };
}

// ── Formatting helpers (shared by the import UI) ──────────────────────────────
export const orumPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
