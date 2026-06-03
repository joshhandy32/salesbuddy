import type {
  AEBrief,
  BDRCoaching,
  BantDimension,
  Disposition,
} from "@/lib/types";

// Small building blocks ------------------------------------------------------

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "blue" | "amber";
  children: React.ReactNode;
}) {
  const accentBar = accent === "blue" ? "bg-blue-600" : "bg-amber-500";
  return (
    <section className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <span className={`h-4 w-1 rounded-full ${accentBar}`} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {title}
        </h2>
      </div>
      <div className="space-y-5 px-5 py-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h3>
      <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}

/** Strip any surrounding straight or curly quotes so the UI's own quotes don't double up. */
function unquote(text: string): string {
  return text.trim().replace(/^["'“”]+|["'“”]+$/g, "");
}

function dispositionStyle(d: Disposition): string {
  switch (d) {
    case "champion":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "blocker":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function BantRow({ label, dim }: { label: string; dim: BantDimension }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {dim.surfaced ? (
        <span className="text-sm italic text-slate-800 dark:text-slate-100">
          “{unquote(dim.evidence)}”
        </span>
      ) : (
        <span className="text-sm text-slate-400">{dim.evidence || "Not surfaced"}</span>
      )}
    </div>
  );
}

// Public cards ---------------------------------------------------------------

export function AEBriefCard({ brief }: { brief: AEBrief }) {
  return (
    <Card title="AE Brief" accent="blue">
      <Field label="Deal summary">{brief.dealSummary}</Field>

      <Field label="BANT">
        <div className="space-y-1.5">
          <BantRow label="Budget" dim={brief.bant.budget} />
          <BantRow label="Authority" dim={brief.bant.authority} />
          <BantRow label="Need" dim={brief.bant.need} />
          <BantRow label="Timeline" dim={brief.bant.timeline} />
        </div>
      </Field>

      <Field label="Why now">{brief.whyNow}</Field>

      <Field label="Who's in the room">
        <ul className="space-y-2">
          {brief.room.map((p, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-slate-500">— {p.role}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${dispositionStyle(
                  p.disposition,
                )}`}
              >
                {p.disposition}
              </span>
              <span className="w-full text-slate-500">{p.reason}</span>
            </li>
          ))}
          {brief.room.length === 0 && (
            <li className="text-slate-400">No attendees identified.</li>
          )}
        </ul>
      </Field>

      <Field label="Suggested opener">
        <p className="rounded-lg bg-blue-50 px-3 py-2 italic text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          “{unquote(brief.suggestedOpener)}”
        </p>
      </Field>

      <Field label="Top risks / open questions">
        <ol className="list-decimal space-y-1 pl-5">
          {brief.risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </Field>
    </Card>
  );
}

export function BDRCoachingCard({ coaching }: { coaching: BDRCoaching }) {
  return (
    <Card title="BDR Coaching Note" accent="amber">
      <Field label="What you did well">{coaching.didWell}</Field>
      <Field label="Improve next time">{coaching.improveNext}</Field>
      <Field label="Qualification gap to probe">{coaching.qualificationGap}</Field>
    </Card>
  );
}
