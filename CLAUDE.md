@AGENTS.md

# SalesBuddy

## What this is
An all-in-one AI sales assistant for early-stage, SMB sales teams. Sits ON TOP of the existing stack (HubSpot, Orum/Nooks, Gong) — it does not place calls or replace the CRM. It turns raw sales artifacts into the right message to the right person, and remembers across conversations.

## Personas
- BDR: coaching notes, objection tracking, pacing.
- AE: a clean pre-meeting brief at handoff.
- Manager: a weekly per-rep coaching digest.

## Modules (full vision — build in this order)
1. Brief engine (BUILD FIRST): paste email + transcript + BDR notes -> structured AE brief + separate BDR coaching note.
2. Slack routing: brief to the AE, coaching note to the BDR channel.
3. Per-rep memory: store every brief so future ones reference past calls.
4. Manager coaching digest.
5. Pacing calculator + commission tracker (from Clozr).
6. ICP analyzer: persona / company size / AE / time-of-day -> what converts.

## Tech stack
- Next.js (App Router, v16) + TypeScript + React 19
- Tailwind CSS v4
- Postgres (Neon or Supabase) via Prisma ORM — DEFERRED until the memory module (#3)
- Anthropic API (@anthropic-ai/sdk) for all AI extraction/briefs
- Deploy target: Vercel

## Working style
- I have no formal coding background. Explain decisions in plain language.
- Ask before large refactors or adding new dependencies.
- Keep changes small and committed often.
- Never commit secrets. Keep API keys in .env.local (gitignored).

## Status
- Stack live: Next.js 16 + TS + Tailwind v4 + Anthropic SDK + Prisma on Postgres (Neon).
- All six modules built: Brief engine (1), Slack routing (2), per-rep memory (3),
  manager coaching digest (4), pacing + commission tracker (5), ICP analyzer (6).
- BDR tooling: Call Blitz (live dial-session tracker that feeds pacing) and
  Playbook (objection / opener / voicemail / email snippet library).
- Full CRM suite: Accounts, Contacts (with lead lifecycle), Deals, and Activities
  (models in schema.prisma; shared vocab + pipeline math in lib/crm.ts), surfaced as
  Leads & Prospecting, Pipeline (stage board with weighted value), Accounts list +
  account/contact detail with activity timeline, and AI-assisted Email Outreach.
- Dashboard (Today) shows a pipeline & leads snapshot once CRM data exists.
- App-wide: ⌘K command palette, one-click copy on brief cards, "Needs attention"
  past-due demo nudges on Today.
- The full product spec is shipped. Further work is polish, depth, and new ideas.
- Local dev note: AI routes read ANTHROPIC_API_KEY from .env.local; `next dev` only
  injects it into route handlers when the var is also in the shell env. To test AI
  routes locally: `set -a; . ./.env.local; set +a; npm run dev`.
