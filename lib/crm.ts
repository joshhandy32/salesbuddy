// Shared CRM vocabulary + helpers. Client-safe (no server imports), used by the
// Leads, Pipeline, Accounts, and Outreach views and their APIs.

// ── Lead lifecycle ───────────────────────────────────────────────────────────
export const LEAD_STATUSES = ["NEW", "WORKING", "QUALIFIED", "UNQUALIFIED", "CUSTOMER"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  WORKING: "Working",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  CUSTOMER: "Customer",
};

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const LEAD_SOURCES = ["CC", "LinkedIn", "Email", "Referral", "Inbound", "List"] as const;

// ── Deal pipeline ────────────────────────────────────────────────────────────
export const DEAL_STAGES = [
  "NEW",
  "DISCOVERY",
  "DEMO",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const DEAL_STAGE_LABEL: Record<string, string> = {
  NEW: "New",
  DISCOVERY: "Discovery",
  DEMO: "Demo",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

// Open (in-flight) stages, in order — the ones shown on the pipeline board.
export const OPEN_STAGES: DealStage[] = ["NEW", "DISCOVERY", "DEMO", "PROPOSAL", "NEGOTIATION"];

// Probability weighting per stage for the weighted pipeline value.
export const STAGE_WEIGHT: Record<string, number> = {
  NEW: 0.1,
  DISCOVERY: 0.25,
  DEMO: 0.4,
  PROPOSAL: 0.6,
  NEGOTIATION: 0.8,
  CLOSED_WON: 1,
  CLOSED_LOST: 0,
};

export const isOpenStage = (s: string) => OPEN_STAGES.includes(s as DealStage);
export const isWon = (s: string) => s === "CLOSED_WON";
export const isLost = (s: string) => s === "CLOSED_LOST";

// ── Validation guards (for API routes) ───────────────────────────────────────
export const isLeadStatus = (v: unknown): v is LeadStatus =>
  typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
export const isDealStage = (v: unknown): v is DealStage =>
  typeof v === "string" && (DEAL_STAGES as readonly string[]).includes(v);
export const isPriority = (v: unknown): v is Priority =>
  typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);

// ── Pipeline math ────────────────────────────────────────────────────────────
export type DealLike = { stage: string; amount: number };

export function pipelineSummary(deals: DealLike[]) {
  const open = deals.filter((d) => isOpenStage(d.stage));
  const won = deals.filter((d) => isWon(d.stage));
  const openValue = open.reduce((s, d) => s + (d.amount || 0), 0);
  const weightedValue = open.reduce(
    (s, d) => s + (d.amount || 0) * (STAGE_WEIGHT[d.stage] ?? 0),
    0,
  );
  const wonValue = won.reduce((s, d) => s + (d.amount || 0), 0);
  return {
    openCount: open.length,
    openValue,
    weightedValue,
    wonCount: won.length,
    wonValue,
  };
}

export const money = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
