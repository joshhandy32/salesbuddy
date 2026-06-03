// Shared shapes for the Brief engine.
// These mirror the `submit_brief` tool schema sent to the Anthropic API,
// so the same structured data can be reused later (e.g. Slack routing).

export type BantDimension = {
  /** Whether this BANT dimension actually came up in the materials. */
  surfaced: boolean;
  /** The supporting direct quote when surfaced; otherwise a short "Not surfaced" note. */
  evidence: string;
};

export type Bant = {
  budget: BantDimension;
  authority: BantDimension;
  need: BantDimension;
  timeline: BantDimension;
};

export type Disposition = "champion" | "blocker" | "neutral";

export type Attendee = {
  name: string;
  role: string;
  disposition: Disposition;
  /** Why we judged them champion/blocker/neutral — grounded in their words. */
  reason: string;
};

export type AEBrief = {
  /** One-line deal summary. */
  dealSummary: string;
  bant: Bant;
  /** The trigger / urgency — why this is moving now. */
  whyNow: string;
  /** People actually named or clearly referenced in the materials. */
  room: Attendee[];
  /** One or two sentences the AE could say verbatim to open. */
  suggestedOpener: string;
  /** Top 2 risks or open questions, hardest-hitting first. */
  risks: string[];
};

export type BDRCoaching = {
  didWell: string;
  improveNext: string;
  qualificationGap: string;
};

export type BriefResult = {
  aeBrief: AEBrief;
  bdrCoaching: BDRCoaching;
};

/** Request body for POST /api/brief. */
export type BriefInput = {
  email: string;
  transcript: string;
  notes: string;
  /** Optional rep this brief belongs to — scopes per-rep memory. */
  repName?: string;
};

/** A brief loaded from the database, with JSON columns parsed. */
export type SavedBrief = {
  id: string;
  createdAt: string;
  updatedAt: string;
  repName: string | null;
  email: string;
  transcript: string;
  notes: string;
  result: BriefResult;
  rating: number | null;
  feedbackNote: string | null;
  /** The rep's edited version, if they corrected the AI output. */
  corrected: BriefResult | null;
};
