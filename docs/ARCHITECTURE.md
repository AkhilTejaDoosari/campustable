# CampusTable architecture — LOCKED

Status: LOCKED 2026-10-16. Do not revisit technology decisions unless implementation proves a hard blocker. Product contract: docs/PRODUCT.md. UI baseline: docs/UI_REFERENCE.md (design/approved-demo-reference.html, SHA256 8db378c5373700f93ad391f8296369dc8ef06d26aad280a3416d9c6c2943000d).

## Locked stack

| #       | Concern       | Decision                                                                  |
| ------- | ------------- | ------------------------------------------------------------------------- |
| ADR-001 | Frontend      | Next.js + TypeScript + Tailwind CSS + shadcn/ui where useful              |
| ADR-002 | Identity      | Clerk (auth, identity, sessions, auth lifecycle)                          |
| ADR-003 | Database      | Supabase PostgreSQL (Cloud)                                               |
| ADR-004 | Storage       | Supabase Storage                                                          |
| ADR-005 | Email         | Resend (application email)                                                |
| ADR-006 | Observability | Sentry                                                                    |
| ADR-007 | Analytics     | PostHog                                                                   |
| ADR-008 | Deployment    | Vercel                                                                    |
| ADR-009 | CI/CD         | GitHub Actions                                                            |
| ADR-010 | AI            | Provider abstraction only; OpenRouter optional later; NOT a V1 dependency |
| ADR-011 | Edge/DNS/WAF  | Cloudflare deferred until concrete need                                   |

Full rationale: docs/DECISIONS.md.

## System boundaries

```
Browser (Next.js App Router)
  │ Clerk session (read-only client) + Supabase anon (RLS) — never service-role
  ▼
Next.js server (Route Handlers / Server Actions / middleware)
  ├── Clerk server SDK: verify session, load identity
  ├── Supabase server client: Postgres (RLS + service-role only where justified) + Storage
  ├── Resend: application email (verification OTP, invitations, notifications)
  ├── Sentry: server + client error/trace capture (no secrets/PII)
  └── PostHog: funnel events via abstraction (no resume/profile content)
```

## Domain ownership (normative)

CampusTable owns: roles, authorization, student profiles, recruiter profiles (schema-reserved, deferred from live V1), organizations, university affiliations, university verification, skills, projects, experience, resumes (metadata), discovery/search, matching rules, notifications, all other business/domain data.

Clerk owns: user identity, authentication methods, auth email, session lifecycle, basic identity metadata only.

Supabase owns: PostgreSQL persistence, object storage. Supabase Auth is NOT used; it remains disabled/unconfigured so there is exactly one identity provider.

Resend owns: CampusTable application email, university verification emails, recruiter invitations (deferred use), product notifications. Resend is never used for Clerk-owned auth flows.

## Identity → domain relationship (normative)

```
Clerk user
    ↓ users.clerk_user_id UNIQUE NOT NULL
users (id UUID PK, clerk_user_id TEXT UNIQUE, primary_email CITEXT, role, onboarding state, timestamps)
    ↓ users.id FK
student_profiles / recruiter_profiles / organizations / affiliations / challenges / ...
```

- Do NOT store the CampusTable domain model in Clerk metadata (no `publicMetadata`/`privateMetadata` profiles).
- Local `users` table linked by `clerk_user_id` is the join point. Clerk webhook (`Svix`-verified) synchronizes identity state idempotently; application code never trusts client-supplied identity.
- Authorization = CampusTable server checks + Postgres RLS/policies + constraints, not Clerk roles alone and not UI hiding.

## Monorepo shape

```
apps/web/            Next.js App Router (UI + Route Handlers + middleware)
packages/db/         Supabase clients, migration runner, generated types
packages/auth/       Clerk server helpers (current user, requireRole, webhook verify)
packages/email/      EmailService abstraction (Resend + console fallback)
packages/storage/    Supabase Storage helpers (keys, MIME/size validation)
packages/analytics/  PostHog abstraction + event names
packages/observability/ Sentry init helpers
packages/shared/     Result/error codes, pagination, idempotency keys
supabase/migrations/ SQL migrations (source of truth for schema)
```

Only create a boundary that has a real responsibility. `apps/api/` is NOT created: Next.js Route Handlers are the API (per UI_BACKEND_MAP domain operations). A separate API service is added only if a hard blocker proves it necessary.

## Data authority

- Identity/session: Clerk.
- Profile and affiliation state: Postgres.
- Mail delivery result: Resend + server-owned challenge state.
- Files: private Supabase Storage objects + `file_records` metadata.
- Role occupancy: active memberships. Contact allowance: durable canonical relationship. Messages: database.
- Physical schema: supabase/migrations/\*.sql; logical groups: docs/DATA_MODEL.md. No speculative tables.

## University verification (domain-owned, separate from Clerk)

Clerk answers "Who is this user?" CampusTable answers "Does this user have a verified relationship with this university?" Flow: authenticated user → enter school email → CampusTable creates OTP challenge (hashed, expiring, single-use, attempt-limited, resend-throttled) → Resend sends code → user submits code → CampusTable validates → affiliation verified. Security: hash OTPs (SHA-256 + pepper, or bcrypt-class), expiry (default 10 min), attempt limit (default 5), single use, resend throttle (default 60s), rate-limit boundary, no raw OTP logging. See docs/DOMAIN.md invariants and Phase 0B acceptance ID-01/ID-02/ID-05/ID-06.

## Storage rules

Resumes + scoped user assets in private Supabase buckets. Authorized signed access only; safe object keys (`{userId}/{uuid}-{sanitized}`); MIME allowlist + size limits enforced server-side and in policy; replacement/deletion updates `file_records`; no public resume enumeration; service-role never reaches the browser.

## Observability / analytics rules

- Sentry: frontend + server errors, useful traces. Scrub secrets/PII before send.
- PostHog funnel events only via helper: `signup_completed, onboarding_started, university_verification_started, university_verified, profile_completed, resume_uploaded, recruiter_onboarding_completed, talent_search_performed`. No content payloads.

## Deployment / environments

Vercel hosts `apps/web`. Environments: development (dedicated Supabase project + Clerk dev instance + Resend test sender), preview (per-PR, disposable data), production (separate project/instance/domain). No production data in non-production. Secrets injected at runtime, never baked into images. CI validates (install/format/lint/typecheck/unit/integration/build/migration check) but does not deploy until deployment config is reviewed and safe.

## Pre-code gate status

Phase 0A + 0B contracts (PRODUCT, USER_FLOWS, UI_BACKEND_MAP, DOMAIN, DATA_MODEL, ACCEPTANCE, UI_REFERENCE) accepted. This file + DECISIONS.md + CONFIGURATION.md + REPO_MAP (below) complete the 0C architecture contract. Remaining 0C operating details (exact rate-limit numbers, retention/restore runbooks, reviewer bootstrap) ride with Slice 1 and are recorded in DECISIONS.md as follow-ups, not silent inventions.

## REPO_MAP

| Path                    | Purpose                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| apps/web/               | Next.js app: `(marketing)` public, `(auth)` sign-in/up, `(app)` protected, `api/` handlers incl. `api/webhooks/clerk`             |
| packages/db/            | Supabase browser/server/admin clients, env validation                                                                             |
| packages/auth/          | `getCurrentUser`, `requireUser`, `requireRole`, webhook `verifySignature` + `syncUser`                                            |
| packages/email/         | `EmailService` interface, `ResendEmailService`, `ConsoleEmailService`                                                             |
| packages/storage/       | Key builder, MIME/size validation, signed-URL helpers                                                                             |
| packages/analytics/     | `track()` helper + `ANALYTICS_EVENTS` map                                                                                         |
| packages/observability/ | Sentry client/server/edge init                                                                                                    |
| packages/shared/        | Error codes (`E.*`), pagination, idempotency helpers                                                                              |
| packages/config/        | Env schema + `requireEnv` (fail-closed startup)                                                                                   |
| packages/ui/            | shadcn-style shared primitives (only shared ones; page UI lives in app)                                                           |
| supabase/migrations/    | Numbered SQL: users → universities → affiliations/challenges → profiles/skills → projects/contacts/messages → files/notifications |
| docs/                   | Product + architecture contracts (this pack)                                                                                      |
| design/                 | Archived approved reference only                                                                                                  |
| .github/workflows/      | CI                                                                                                                                |
