// Guards against AI-error strings / empty summaries showing as brief titles.

const ERROR_SIGNATURES = [
  "no usable",
  "cannot be",
  "unable to",
  "could not be",
  "no discovery",
  "not enough information",
  "insufficient",
];

export function isBadDealSummary(s: string | null | undefined): boolean {
  if (!s) return true;
  const t = s.trim().toLowerCase();
  if (t.length < 4) return true;
  return ERROR_SIGNATURES.some((sig) => t.startsWith(sig) || t.includes(sig));
}

/**
 * Safe display title for a brief: the deal summary, or "Untitled brief" when the
 * extraction failed (flagged) or the summary is empty / an AI error string.
 */
export function briefDisplayTitle(
  dealSummary: string | null | undefined,
  flagged?: boolean,
): { title: string; failed: boolean } {
  if (flagged || isBadDealSummary(dealSummary)) {
    return { title: "Untitled brief", failed: true };
  }
  return { title: (dealSummary as string).trim(), failed: false };
}
