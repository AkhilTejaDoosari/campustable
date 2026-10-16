# Architecture decisions — LOCKED 2026-10-16

How to read: each ADR is LOCKED. Revisit only if implementation proves a hard blocker, recorded as a new superseding ADR. "Proposal" labels are not used here; everything below is a decision.

## ADR-001 Frontend → Next.js + TypeScript (+ Tailwind CSS, shadcn/ui where useful)

- Status: LOCKED.
- Context: Team of one on Mac, pilot before launch, approved visual reference must be ported 1:1 (UI_REFERENCE.md). Need SSR/SSG marketing + authenticated app + Route Handler API in one deployable.
- Decision: Next.js App Router + TypeScript strict + Tailwind CSS; shadcn/ui primitives only where they match the approved UI (no generic-dashboard redesign).
- Consequences: One Vercel deployable; strict types enforced in CI; Tailwind/shadcn must be bent to the reference, not the reverse.

## ADR-002 Identity → Clerk

- Status: LOCKED.
- Context: Supabase provides Auth, but product needs identity kept as a separate system boundary from application data, with university verification as a CampusTable domain concern and replaceable identity provider.
- Decision: Clerk owns authentication, identity, sessions, auth-related account lifecycle (incl. auth email, recovery, basic identity metadata). CampusTable owns roles, authorization, and all domain data. Supabase Auth is not used.
- Why Clerk even though Supabase provides auth:
  1. Identity is intentionally a separate system boundary from persistence/storage.
  2. Supabase remains persistence/storage infrastructure, not the identity authority.
  3. CampusTable owns authorization and domain roles server-side + RLS; Clerk is not the permission system.
  4. Avoids stuffing student/recruiter profiles, affiliations, skills, projects into auth metadata.
  5. Identity provider stays replaceable without migrating application data (re-point `users.clerk_user_id` sync).
  6. University mailbox verification stays a CampusTable domain flow (OTP challenges in Postgres, Resend delivery), distinct from login identity.
- Trade-offs (accepted, not hidden): more vendors; more integration work (provider, middleware, webhook sync); webhook synchronization lag/failure handling; additional failure boundary (Clerk outage ≠ database outage; degraded-auth UX required).
- Consequences: Local `users(clerk_user_id UNIQUE)` is the join; Svix-verified Clerk webhook syncs identity idempotently; no domain data in Clerk metadata; authz enforced in app + RLS.

## ADR-003 Database → Supabase PostgreSQL

- Status: LOCKED.
- Context: Need managed Postgres with RLS, migrations, and coexistence with Storage on one data plane.
- Decision: Supabase Cloud PostgreSQL as the application database. Migrations in `supabase/migrations/*.sql`, applied via Supabase CLI/CI. DATA_MODEL.md is the logical authority; migrations are the physical authority.
- Consequences: RLS + grants per table; partial unique indexes (e.g. one active school-email claim); transactions for capacity/contact/membership races; disposable test database for destructive/concurrency tests.

## ADR-004 Storage → Supabase Storage

- Status: LOCKED.
- Context: Resumes + scoped user assets; private by default; owner-controlled access.
- Decision: Supabase Storage private buckets + `file_records` metadata table. Signed URLs only; safe keys; MIME/size validation; no public resume enumeration; service-role server-only.
- Consequences: Storage policies + app-level checks; replacement/delete keeps metadata consistent.

## ADR-005 Email → Resend

- Status: LOCKED.
- Context: Need transactional/application email (verification OTP, invitations, notifications). Supabase default SMTP is restricted and not a general delivery solution (see CONFIGURATION.md sources).
- Decision: Resend via an `EmailService` abstraction; `ConsoleEmailService` dev fallback (local capture, never fake success in real runtime). Resend never handles Clerk-owned auth email.
- Consequences: Sender identity/DNS (SPF/DKIM) must be verified before pilot sends; quota/pricing checked; delivery failure leaves verification pending/failed, never fake-verified.

## ADR-006 Observability → Sentry

- Status: LOCKED.
- Context: Need frontend + server error/trace visibility across slices without leaking PII/secrets.
- Decision: Sentry (client/server/edge init in `packages/observability`), scrubbed payloads, env-gated DSN.
- Consequences: Sourcemaps via build plugin only if token present; scrub `email`, OTP, tokens, cookies.

## ADR-007 Analytics → PostHog

- Status: LOCKED.
- Context: Need funnel evidence (signup → onboarding → verification → profile → project → team) without spraying calls or shipping content.
- Decision: PostHog via `packages/analytics` helper + `ANALYTICS_EVENTS` naming convention. Funnel events only (see ARCHITECTURE.md list). No resume/profile content, no mailbox values.
- Consequences: helper is the only import path for events; content fields blocklisted in review.

## ADR-008 Deployment → Vercel

- Status: LOCKED.
- Context: Next.js app + preview-per-PR + minimal ops for one developer.
- Decision: Vercel hosts `apps/web`. Build: `npm run build` (turbo/none for single-app start). Env injected at runtime. Clerk/Supabase/Resend/Sentry/PostHog configured per environment.
- Consequences: No Starkwolf/DuckDNS hosting for V1 (supersedes older PRODUCT.md note); no production deploy from CI until config reviewed.

## ADR-009 CI/CD → GitHub Actions

- Status: LOCKED.
- Context: Need reviewable quality gates per slice without auto-deploying.
- Decision: GitHub Actions on PR/push: install → format check → lint → typecheck → unit tests → integration (where practical) → build → migration validation (parse/lint, plus disposable-DB apply when secrets present). No deploy job until ADR-008 config is safe.
- Consequences: CI uses isolated test resources; never production keys.

## ADR-010 AI → provider abstraction; OpenRouter optional; NOT a V1 dependency

- Status: LOCKED.
- Context: PRODUCT.md non-goal: no AI/BYOK assistant; manual discovery first. Avoid coupling V1 to a model vendor.
- Decision: `packages/ai` (when needed) exposes a provider interface only. OpenRouter may be added later as one provider. No AI keys required for V1; no AI in the Slice 1 foundation beyond the interface seam.
- Consequences: No model calls in V1 paths; no AI credentials in env contract beyond a reserved stub.

## ADR-011 Cloudflare → deferred

- Status: LOCKED (deferred).
- Context: No concrete need for Edge/DNS/WAF in front of Vercel for the pilot.
- Decision: Defer Cloudflare until a concrete need (abuse, caching, WAF rule) is demonstrated. Record the trigger when it arises.
- Consequences: No Cloudflare config in V1; revisit via superseding ADR only.

## Follow-ups riding with Slice 1 (not blockers for lock)

- Final numeric abuse limits (OTP expiry/attempts/resend throttle) — defaults in code, tuned with 0C policy review.
- Reviewer bootstrap + retention/restore runbooks — Slice 5 pilot release hardens them.
- Sender domain + per-environment Clerk/Supabase project identities — collected privately, recorded as presence (never values) in CONFIGURATION.md.
