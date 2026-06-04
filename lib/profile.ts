// Shared profile types + helpers (client-safe — no server imports).

export type CommissionModel = "percent" | "flat";

export type UserProfile = {
  name: string;
  role: "BDR" | "AE" | "Manager";
  quota: number;
  tier: "BDR1" | "BDR2" | "BDR3" | "AE";
  workingDays: number | null;
  commissionModel: CommissionModel;
  commissionRate: number;
  flatBonus: number;
};

export const TIERS: { tier: string; quota: number }[] = [
  { tier: "BDR1", quota: 8 },
  { tier: "BDR2", quota: 11 },
  { tier: "BDR3", quota: 14 },
  { tier: "AE", quota: 6 },
];

/** Number of weekdays (Mon–Fri) in a given month. */
export function weekdaysInMonth(year: number, month0: number): number {
  const days = new Date(year, month0 + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month0, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function currentMonthWorkingDays(): number {
  const n = new Date();
  return weekdaysInMonth(n.getFullYear(), n.getMonth());
}
