import type {
  AEBrief,
  BDRCoaching,
  BantDimension,
  Disposition,
  FollowUpEmail,
} from "@/lib/types";

/** Strip any surrounding straight or curly quotes so the UI's own quotes don't double up. */
function unquote(text: string): string {
  return (text ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "");
}

// Small building blocks ------------------------------------------------------

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "coral" | "teal" | "navy";
  children: React.ReactNode;
}) {
  const bar =
    accent === "coral" ? "bg-coral" : accent === "teal" ? "bg-teal" : "bg-navy";
  return (
    <section className="card flex-1 self-start">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <span className={`h-4 w-1 rounded-full ${bar}`} />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink">
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
      <h3 className="label-caps mb-1.5">{label}</h3>
      <div className="text-[13px] leading-relaxed text-body">{children}</div>
    </div>
  );
}

function dispositionPill(d: Disposition): string {
  switch (d) {
    case "champion":
      return "pill pill-teal";
    case "blocker":
      return "pill pill-coral";
    default:
      return "pill";
  }
}

function BantRow({ label, dim }: { label: string; dim?: BantDimension }) {
  return (
    <div className="flex gap-3">
      <span className="label-caps w-20 shrink-0 pt-0.5">{label}</span>
      {dim?.surfaced ? (
        <span className="text-[13px] italic text-ink">
          “{unquote(dim.evidence)}”
        </span>
      ) : (
        <span className="text-[13px] text-muted">
          {dim?.evidence || "Not surfaced"}
        </span>
      )}
    </div>
  );
}

// Public cards ---------------------------------------------------------------

export function AEBriefCard({ brief }: { brief: AEBrief }) {
  // Be defensive: older/malformed records may be missing nested fields.
  const ae = brief && typeof brief === "object" ? brief : ({} as AEBrief);
  const room = Array.isArray(ae.room) ? ae.room : [];
  const risks = Array.isArray(ae.risks) ? ae.risks : [];

  return (
    <Card title="AE Brief" accent="coral">
      <Field label="Deal summary">
        <span className="font-medium text-ink">
          {ae.dealSummary || <span className="text-muted">Not available</span>}
        </span>
      </Field>

      <Field label="BANT">
        <div className="space-y-2">
          <BantRow label="Budget" dim={ae.bant?.budget} />
          <BantRow label="Authority" dim={ae.bant?.authority} />
          <BantRow label="Need" dim={ae.bant?.need} />
          <BantRow label="Timeline" dim={ae.bant?.timeline} />
        </div>
      </Field>

      <Field label="Why now">
        {ae.whyNow || <span className="text-muted">Not available</span>}
      </Field>

      <Field label="Who's in the room">
        <ul className="space-y-2.5">
          {room.map((p, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-ink">{p?.name}</span>
              <span className="text-muted">— {p?.role}</span>
              {p?.disposition && (
                <span className={dispositionPill(p.disposition)}>{p.disposition}</span>
              )}
              <span className="w-full text-muted">{p?.reason}</span>
            </li>
          ))}
          {room.length === 0 && (
            <li className="text-muted">No attendees identified.</li>
          )}
        </ul>
      </Field>

      <Field label="Suggested opener">
        <p className="rounded-input bg-coral-bg px-3.5 py-2.5 italic text-coral-dark">
          “{unquote(ae.suggestedOpener)}”
        </p>
      </Field>

      <Field label="Top risks / open questions">
        <ol className="list-decimal space-y-1.5 pl-5 marker:text-coral marker:font-semibold">
          {risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
          {risks.length === 0 && <li className="text-muted">None flagged.</li>}
        </ol>
      </Field>
    </Card>
  );
}

export function BDRCoachingCard({ coaching }: { coaching: BDRCoaching }) {
  const c = coaching && typeof coaching === "object" ? coaching : ({} as BDRCoaching);
  const fallback = <span className="text-muted">Not available</span>;
  return (
    <Card title="BDR Coaching Note" accent="coral">
      <Field label="What you did well">{c.didWell || fallback}</Field>
      <Field label="Improve next time">{c.improveNext || fallback}</Field>
      <Field label="Qualification gap to probe">{c.qualificationGap || fallback}</Field>
    </Card>
  );
}

export function FollowUpEmailCard({ email }: { email: FollowUpEmail }) {
  return (
    <Card title="Follow-Up Email Draft" accent="navy">
      <Field label="Subject">
        <span className="font-medium text-ink">{email.subject}</span>
      </Field>
      <Field label="Body">
        <p className="whitespace-pre-wrap leading-relaxed">{email.body}</p>
      </Field>
    </Card>
  );
}
