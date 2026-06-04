// Plain-text formatters for copying a brief out of the app (into Slack, email,
// a CRM note, etc.). Pure + client-safe. Kept separate from the JSX cards so the
// copy text stays clean and easy to tweak in one place.

import type { AEBrief, BDRCoaching, FollowUpEmail } from "./types";

function unquote(text: string | undefined): string {
  return (text ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "");
}

const BANT_ORDER: { key: keyof AEBrief["bant"]; label: string }[] = [
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority" },
  { key: "need", label: "Need" },
  { key: "timeline", label: "Timeline" },
];

export function formatAEBrief(ae: AEBrief): string {
  const lines: string[] = [];
  lines.push(`AE BRIEF — ${ae?.dealSummary?.trim() || "Untitled"}`);
  lines.push("");

  lines.push("BANT");
  for (const { key, label } of BANT_ORDER) {
    const dim = ae?.bant?.[key];
    const val = dim?.surfaced ? `"${unquote(dim.evidence)}"` : dim?.evidence?.trim() || "Not surfaced";
    lines.push(`• ${label}: ${val}`);
  }
  lines.push("");

  if (ae?.whyNow?.trim()) {
    lines.push(`Why now: ${ae.whyNow.trim()}`);
    lines.push("");
  }

  const room = Array.isArray(ae?.room) ? ae.room : [];
  if (room.length) {
    lines.push("Who's in the room:");
    for (const p of room) {
      const disp = p?.disposition ? ` (${p.disposition})` : "";
      const reason = p?.reason?.trim() ? `: ${p.reason.trim()}` : "";
      lines.push(`• ${p?.name ?? ""} — ${p?.role ?? ""}${disp}${reason}`);
    }
    lines.push("");
  }

  if (unquote(ae?.suggestedOpener)) {
    lines.push(`Suggested opener: "${unquote(ae.suggestedOpener)}"`);
    lines.push("");
  }

  const risks = (Array.isArray(ae?.risks) ? ae.risks : []).filter(
    (r) => r?.trim() && !/^none flagged\.?$/i.test(r.trim()),
  );
  if (risks.length) {
    lines.push("Top risks / open questions:");
    risks.forEach((r, i) => lines.push(`${i + 1}. ${r.trim()}`));
  }

  return lines.join("\n").trim();
}

export function formatCoaching(c: BDRCoaching): string {
  return [
    "BDR COACHING NOTE",
    "",
    `What you did well: ${c?.didWell?.trim() || "—"}`,
    `Improve next time: ${c?.improveNext?.trim() || "—"}`,
    `Qualification gap to probe: ${c?.qualificationGap?.trim() || "—"}`,
  ].join("\n");
}

export function formatEmail(e: FollowUpEmail): string {
  return [`Subject: ${e?.subject?.trim() || ""}`, "", e?.body?.trim() || ""].join("\n").trim();
}
