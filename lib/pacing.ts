// Pure, transparent math for the Pacing & Commission tool.
// Everything is completes-based (SQOs), not dollar-quota-based.
// Each function returns the raw numbers; the UI shows the breakdown alongside.

export type CommissionModel = "percent" | "flat";

export type PacingSettings = {
  quota: number;
  commissionModel: CommissionModel;
  commissionRate: number; // percent value, e.g. 3 === 3%
  flatBonus: number; // $ per closed deal
};

export type PacingMonth = {
  id: string;
  month: string;
  sets: number;
  shows: number;
  completes: number;
  quota: number;
};

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

// ── 1. Pacing ───────────────────────────────────────────────────────────────
export type PacingInputs = {
  quota: number;
  sets: number;
  shows: number;
  completes: number;
  daysElapsed: number;
  daysInMonth: number;
};

export type PacingResult = {
  setShowRate: number; // shows / sets        (0..1)
  showCompleteRate: number; // completes / shows  (0..1)
  setCompleteRate: number; // completes / sets   (0..1)
  attainment: number; // completes / quota
  expectedToDate: number; // quota * daysElapsed / daysInMonth
  delta: number; // completes - expectedToDate  (>0 ahead, <0 behind)
  projection: number; // run-rate EOM = completes / daysElapsed * daysInMonth
  completesToQuota: number; // max(0, quota - completes)
  runRateMultiple: number; // daysInMonth / daysElapsed
  onPace: boolean; // projection >= quota
};

export function computePacing(i: PacingInputs): PacingResult {
  const expectedToDate = i.quota * safeDiv(i.daysElapsed, i.daysInMonth);
  const runRateMultiple = safeDiv(i.daysInMonth, i.daysElapsed);
  const projection = i.completes * runRateMultiple;
  return {
    setShowRate: safeDiv(i.shows, i.sets),
    showCompleteRate: safeDiv(i.completes, i.shows),
    setCompleteRate: safeDiv(i.completes, i.sets),
    attainment: safeDiv(i.completes, i.quota),
    expectedToDate,
    delta: i.completes - expectedToDate,
    projection,
    completesToQuota: Math.max(0, i.quota - i.completes),
    runRateMultiple,
    onPace: projection >= i.quota && i.completes > 0,
  };
}

// ── 2. Play (back-solve) ─────────────────────────────────────────────────────
export type PlayResult = {
  showsNeeded: number; // remainingCompletes / showCompleteRate
  setsNeeded: number; // showsNeeded / setShowRate
};

export function computePlay(
  remainingCompletes: number,
  setShowRate: number,
  showCompleteRate: number,
): PlayResult {
  const showsNeeded = showCompleteRate > 0 ? remainingCompletes / showCompleteRate : 0;
  const setsNeeded = setShowRate > 0 ? showsNeeded / setShowRate : 0;
  return { showsNeeded, setsNeeded };
}

// ── 3. Commission ────────────────────────────────────────────────────────────
export type CommissionInputs = {
  model: CommissionModel;
  rate: number; // percent value
  flatBonus: number; // $ per deal
  revenue: number; // closed-won $ (percent model)
  deals: number; // closed deal count (flat model)
  runRateMultiple: number; // from pacing, to project EOM
};

export type CommissionResult = {
  soFar: number;
  projected: number; // soFar scaled by the run-rate multiple
};

export function computeCommission(i: CommissionInputs): CommissionResult {
  const soFar =
    i.model === "percent" ? i.revenue * (i.rate / 100) : i.deals * i.flatBonus;
  const multiple = i.runRateMultiple > 0 ? i.runRateMultiple : 1;
  return { soFar, projected: soFar * multiple };
}

// ── Formatting helpers (shared by the UI) ────────────────────────────────────
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const money = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
export const round1 = (v: number) => Math.round(v * 10) / 10;
