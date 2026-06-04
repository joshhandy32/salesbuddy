// Pure math for the Pacing Calculator (client-safe).

export type Historical = {
  id: string;
  month: string; // YYYY-MM
  dials: number;
  connects: number;
  conversations: number;
  orumDemoSets: number;
  otherDemoSets: number;
  demoShows: number;
  demoCompletes: number;
  closedDeals: number;
  revenue: number;
  reliefs: number;
};

export const totalSets = (h: Historical) => h.orumDemoSets + h.otherDemoSets;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export type Totals = {
  dials: number;
  connects: number;
  conversations: number;
  totalSets: number;
  demoShows: number;
  demoCompletes: number;
  closedDeals: number;
  revenue: number;
  reliefs: number;
};

export function aggregate(rows: Historical[]): Totals {
  return rows.reduce<Totals>(
    (t, h) => ({
      dials: t.dials + h.dials,
      connects: t.connects + h.connects,
      conversations: t.conversations + h.conversations,
      totalSets: t.totalSets + totalSets(h),
      demoShows: t.demoShows + h.demoShows,
      demoCompletes: t.demoCompletes + h.demoCompletes,
      closedDeals: t.closedDeals + h.closedDeals,
      revenue: t.revenue + h.revenue,
      reliefs: t.reliefs + h.reliefs,
    }),
    { dials: 0, connects: 0, conversations: 0, totalSets: 0, demoShows: 0, demoCompletes: 0, closedDeals: 0, revenue: 0, reliefs: 0 },
  );
}

export type RateKey =
  | "connectRate"
  | "conversationRate"
  | "demoSetRate"
  | "showRate"
  | "completeRate"
  | "closeRate"
  | "canceledRate"
  | "nonQualRate"
  | "trueShowRate"
  | "showsPerComplete"
  | "setsPerComplete";

export type Rates = Record<RateKey, number>;

export function ratesFrom(t: Totals): Rates {
  return {
    connectRate: safeDiv(t.connects, t.dials),
    conversationRate: safeDiv(t.conversations, t.connects),
    demoSetRate: safeDiv(t.totalSets, t.conversations),
    showRate: safeDiv(t.demoShows, t.totalSets),
    completeRate: safeDiv(t.demoCompletes, t.demoShows),
    closeRate: safeDiv(t.closedDeals, t.demoCompletes),
    canceledRate: safeDiv(t.totalSets - t.demoShows, t.totalSets),
    nonQualRate: safeDiv(t.reliefs, t.totalSets),
    trueShowRate: safeDiv(t.demoShows, t.totalSets - t.reliefs),
    showsPerComplete: safeDiv(t.demoShows, t.demoCompletes),
    setsPerComplete: safeDiv(t.totalSets, t.demoCompletes),
  };
}

export const RATE_DEFS: {
  key: RateKey;
  label: string;
  formula: string;
  benchmark: number | null;
  isPct: boolean;
}[] = [
  { key: "connectRate", label: "Connect Rate", formula: "Connects ÷ Dials — how often a dial reaches a live person.", benchmark: null, isPct: true },
  { key: "conversationRate", label: "Conversation Rate", formula: "Conversations ÷ Connects — how often a connect becomes a real conversation.", benchmark: null, isPct: true },
  { key: "demoSetRate", label: "Demo Set Rate", formula: "Total Demo Sets ÷ Conversations — how often a conversation books a demo. Benchmark: > 8%.", benchmark: 0.08, isPct: true },
  { key: "showRate", label: "Show Rate", formula: "Demo Shows ÷ Total Demo Sets — how often a booked demo shows up. Benchmark: > 60%.", benchmark: 0.6, isPct: true },
  { key: "completeRate", label: "Complete Rate", formula: "Completes ÷ Demo Shows — how often a show becomes a qualified complete. Benchmark: > 50%.", benchmark: 0.5, isPct: true },
  { key: "closeRate", label: "Close Rate", formula: "Closed Deals ÷ Completes — how often a complete becomes a closed deal. Benchmark: > 15%.", benchmark: 0.15, isPct: true },
  { key: "canceledRate", label: "Canceled / No-Show Rate", formula: "(Total Sets − Shows) ÷ Total Sets — share of booked demos that fall through.", benchmark: null, isPct: true },
  { key: "nonQualRate", label: "Non-Qualified Rate", formula: "Reliefs ÷ Total Sets — share of sets relieved as non-qualified.", benchmark: null, isPct: true },
  { key: "trueShowRate", label: "True Show Rate", formula: "Shows ÷ (Total Sets − Reliefs) — show rate excluding non-qualified sets.", benchmark: null, isPct: true },
  { key: "showsPerComplete", label: "Shows per Complete", formula: "Shows ÷ Completes — how many shows it takes to land one complete.", benchmark: null, isPct: false },
  { key: "setsPerComplete", label: "Sets per Complete", formula: "Total Sets ÷ Completes — how many sets it takes to land one complete.", benchmark: null, isPct: false },
];

// ── Play Calculator projection ────────────────────────────────────────────
export type PlayInputs = {
  workingDays: number;
  dialsPerDay: number;
  connectRate: number; // 0..1
  conversationRate: number;
  demoSetRate: number;
  showRate: number;
  completeRate: number;
  closeRate: number;
};

export type PlayOutput = {
  dailyConnects: number;
  dailyConversations: number;
  dailyDemoSets: number;
  dailyShows: number;
  dailyCompletes: number;
  monthlyCompletes: number;
  monthlyClosedDeals: number;
};

export function project(i: PlayInputs): PlayOutput {
  const dailyConnects = i.dialsPerDay * i.connectRate;
  const dailyConversations = dailyConnects * i.conversationRate;
  const dailyDemoSets = dailyConversations * i.demoSetRate;
  const dailyShows = dailyDemoSets * i.showRate;
  const dailyCompletes = dailyShows * i.completeRate;
  const monthlyCompletes = dailyCompletes * i.workingDays;
  const monthlyClosedDeals = monthlyCompletes * i.closeRate;
  return { dailyConnects, dailyConversations, dailyDemoSets, dailyShows, dailyCompletes, monthlyCompletes, monthlyClosedDeals };
}

// ── Formatting ────────────────────────────────────────────────────────────
export const pct2 = (v: number) => `${(v * 100).toFixed(2)}%`;
export const num1 = (v: number) => (Math.round(v * 10) / 10).toString();
export const money0 = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
