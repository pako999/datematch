# DateMatch — Matchmaking Agency Console

**Staff-facing internal tool** for a professional matchmaking agency, plus a lightweight **client portal**. Matchmakers manage a roster of clients, get AI-ranked compatibility shortlists with human-style rationales, and run introductions through a tracked pipeline whose feedback loops back into matching. Clients can self-register and complete their own intake; everything else is curated by staff — no swiping, no client-to-client chat.

## Stack

Next.js 15 (App Router, RSC, Server Actions) · TypeScript strict · Tailwind v4 · Clerk (auth for staff + portal clients) · Neon PostgreSQL + Drizzle + pgvector · Inngest (recompute, embeddings, reminders) · Resend (notifications + intro emails) · PostHog (internal analytics) · Anthropic `claude-sonnet-4-6` (rationales + intake summaries) · Voyage AI (bio embeddings) · Vercel Blob (photo uploads) · Vercel.

## Setup

```bash
pnpm install
cp .env.example .env        # fill in keys — every integration degrades gracefully if unset
pnpm db:migrate             # applies drizzle/ migrations (enables pgvector)
pnpm db:seed                # labelled test personas; refuses a non-empty DB without --force
pnpm dev
```

**Migrations are also automatic on deploy:** `pnpm build` runs `scripts/migrate.ts` first, which applies pending migrations when `DATABASE_URL` is set and skips cleanly when it isn't. Demo data can be loaded without a terminal via the admin-only **Load demo data** button in `/settings` (only offered while the roster is empty; never overwrites anything).

Checks: `pnpm typecheck` · `pnpm test` · `pnpm build`

**First admin:** set `ADMIN_BOOTSTRAP_EMAILS` to your email, sign in at `/sign-in` — you become an `admin` on first visit to the console. Add further staff in `/settings` (they get access when they first sign in with that email).

## Roles

| Role | Access |
|---|---|
| `admin` | Everything: staff management, all clients, GDPR delete, settings |
| `matchmaker` | Their assigned (or unassigned) clients, create/advance intros, suggestions |
| `readonly` | View only |

Portal clients are Clerk users too, linked by `clients.clerk_user_id`; they only ever see `/portal`.

## Screens

- `/dashboard` — my clients, intros needing action, stale intros, this week's feedback
- `/clients` — searchable roster (status, city, matchmaker, mine-only)
- `/clients/[id]` — profile: AI intake summary, preferences, questionnaire, private photos, notes timeline, **suggested matches** (tier badge + rationale + propose button), intro history, management, GDPR delete (admin)
- `/clients/new`, `/clients/[id]/edit` — staff intake, resumable per section
- `/introductions` — Kanban pipeline, drag to advance; ambiguous moves live on the intro page
- `/introductions/[id]` — side-by-side profiles, one-click transitions, scheduling, per-side feedback
- `/feedback` — stream with negative sentiment pinned for follow-up
- `/settings` — staff & roles (admin), scoring configuration, account
- `/portal` + `/portal/profile` — client self-registration and resumable intake (basics → preferences → questionnaire → consent)

## How scoring works

`computePairScore(a, b, opts)` in `src/lib/matching/score.ts` returns `{ score: 0–100, breakdown }`. It's a pure function: the recompute path (`src/lib/matching/candidates.ts`) pre-filters candidates in SQL (status/consent/mutual gender interest) and computes the pgvector cosine in the same query, but every hard filter is re-checked in the engine — SQL is an optimization, never the source of truth.

**Hard filters (any hit → score 0):** pair in `match_exclusions` · either status ≠ `active` · either without `consentToIntroduce` · gender-interest mismatch either way · either outside the other's age range · distance beyond either's `maxDistanceKm` · any dealbreaker hit (dealbreakers only fire on *answered* questions).

**Weighted components:**

| Component | Weight | How |
|---|---|---|
| Intake compatibility | 40% | Per-question rules in `questions.ts`: `similarity` / `complementarity` (likert), `exact`, `overlap` (Jaccard). Weights renormalize over mutually-answered questions. |
| Semantic bio similarity | 25% | Voyage `voyage-3.5` embeddings (1024-dim), pgvector cosine rescaled from the typical 0.15–0.85 band. |
| Must-haves satisfaction | 20% | Two-way: fraction of A's must-haves B satisfies, averaged with the reverse. |
| Proximity | 15% | Flat 1.0 in-city / under 15 km, exponential decay beyond (~50 km constant). |

Missing data (no embedding yet, no coordinates) **drops the component and renormalizes** the rest — incomplete data lowers confidence, not the ceiling. Full per-component breakdown is stored on `match_scores.breakdown`; pairs are canonical (`clientAId < clientBId`).

**Human-matchmaker touches:** scores are presented as tiers (Strong ≥75 / Promising ≥55 / Stretch) rather than decimals; the shortlist always includes one **wildcard** (high bio resonance outside the top ranks — stated preferences aren't revealed preferences); a heavily-weighted `timeline` ("readiness to settle down") question captures life-stage fit; and the AI rationale is prompted to end with the risk flag a human matchmaker would raise ("Watch: …"). Rationales are cached on the score row and invalidated on every recompute; they never invent facts beyond the two profiles and the breakdown.

## How the intro pipeline works

`suggested → proposed → accepted_a/accepted_b → both_accepted → date_scheduled → met → success | declined | no_match`

Transitions are validated against a state machine (`src/lib/staff/intros.ts`) and every one is logged to `intro_status_history` with the acting staff member. On mutual acceptance, agency-branded intro emails go to both clients (Resend) and involved matchmakers are notified. After the date, staff log feedback from each side (rating, sentiment, second-date interest). **Outcomes are automatic once both sides are in:** both positive → `success`; any negative → `declined` plus a permanent `match_exclusions` row (and the stored score is removed). Mixed/neutral stays at `met` for human judgement.

## Background jobs (Inngest)

- `client-changed-recompute` — debounced per client; re-embeds the bio if it changed, recomputes pair scores, pre-generates rationales for the top 3 pairs. The same work also runs inline in server actions, so the console works without an Inngest runner; the job is the retry/batch layer.
- `client-deleted-cleanup` — post-GDPR-delete sweep + hook for external erasure.
- `stale-proposed-reminder` (daily 08:00 UTC) — intros in `proposed` > 5 days → nudge the initiating matchmaker.
- `missing-feedback-reminder` (daily 09:00 UTC) — `met` > 7 days with missing feedback → nudge to collect it.

Local dev: `npx inngest-cli dev` and point it at `/api/inngest`.

## Analytics (PostHog, server-side)

`client_created`, `intake_completed`, `suggestions_viewed`, `intro_proposed`, `intro_accepted`, `date_scheduled`, `intro_success`, `feedback_logged` — captured from server actions (`src/lib/analytics.ts`), keyed by staff id (or Clerk id for portal events), so throughput and funnel success per matchmaker fall out directly.

## Privacy

Client PII (photos, contact details) is staff-only; the portal shows a client only their own record; there are no public data routes. Photos upload to Vercel Blob (JPEG/PNG/WebP ≤ 5 MB, both from the portal and the staff profile); blob URLs carry unguessable random suffixes and are only rendered inside authenticated pages, and the blob is deleted along with the photo row. Every edit is attributable (`updated_by_staff_id` + notes timeline + intro history). Clients without consent never enter any shortlist (enforced in SQL *and* the engine). 18+ age gate on both intake paths. GDPR hard-delete (admin, name-confirmation required) cascades through everything via FKs, then an Inngest job sweeps and hooks external systems.

## Seed data

`pnpm db:seed` loads 10 labelled personas (`[SEED]`, `@seed.example.test`) across Slovenian cities with deliberate edge cases (no-consent lead, paused client, dealbreaker collisions), 3 sample intros across the pipeline (including a completed negative-feedback loop with its auto-exclusion), and pair scores computed by the real engine — no fabricated numbers. Destructive: refuses a non-empty database unless run with `--force`.

## Deploy (Vercel)

1. Import the repo and set env vars from `.env.example` (all optional integrations no-op gracefully when unset; the landing page lists any missing required vars).
2. Deploy — migrations run automatically during the build.
3. Sign in with a bootstrap admin email; optionally click **Load demo data** in `/settings`.
4. Point the Inngest app at `https://<app>/api/inngest` (if using background jobs).
