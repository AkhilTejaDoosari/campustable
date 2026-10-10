# Decisions log — spec 001-campus-collaboration (2026-10-10)

Authoritative choices live in `docs/DECISIONS.md` (Settled 2026-10-10). This log is the implementer-facing companion: operation detail, error surface, and test hooks per decision. Nothing here is production-ready.

## D1 — `accept_collaboration_request(request_id)`
- Transaction sequence (single DB txn, all-or-nothing):
  1. Authenticate caller; load request row; verify caller is the project owner.
  2. `SELECT ... FOR UPDATE` the `project_roles` row for the request's role.
  3. Assert request is `pending`, role is `open`, project accepts requests (`open`/`in_progress` per lifecycle rules).
  4. Idempotency: if request is already `accepted`, return existing membership/conversation ids without inserting.
  5. Capacity check (D3) while holding the role lock.
  6. Insert/ensure `project_memberships` (active), `conversations` + `conversation_members`, mark request `accepted`.
- Errors: `unauthenticated` (no session), `forbidden` (non-owner), `conflict` (closed/filled role, capacity reached, duplicate active membership), `validation` (bad request_id / wrong state).
- Tests: retried accept returns same ids with one membership; two concurrent accepts never exceed capacity; non-owner accept denied at DB layer, not just UI.

## D2 — Pair-intro limit
- Schema: introductions record keyed by normalized `(LEAST(a,b), GREATEST(a,b))` pair unique index; index covers rows in every status (`pending`, `accepted`, `declined`, `withdrawn`) so decline/withdraw never frees a second intro.
- Already-connected flow: applicant with an accepted pair targeting a new project inserts a project-scoped application row (project + role + commitment) referencing the pair; no new intro row; messaging uses the pair's conversation grant (project-scoped thread).
- Tests: second intro attempt after decline/withdraw rejected; application-without-intro for connected pair succeeds; crafted request bypassing pair check rejected server-side.

## D3 — Role capacity
- Schema: `project_roles.capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0)`.
- Rule: accept fails `conflict` when `count(active memberships for role) >= capacity`, evaluated while holding the D1 role-row lock.
- Tests: capacity-1 role with two concurrent accepts yields exactly one membership and one `conflict`; owner fill/close transitions take the same lock.

## D4 — University OTP challenge (live path BLOCKED)
- Parameters: 6-digit numeric OTP; store `sha256(code)` only; 15-minute expiry; max 5 verify attempts per challenge; per-email send rate limit via persistent shared enforcement.
- Vendor: UNDECIDED (candidates Resend / Supabase Auth email). BLOCKED credential: transactional-email provider API key or SMTP username+password in private server environment — absent from this repo by design.
- Test/demo: deterministic hash allowed ONLY behind an explicit `SIMULATED` label and code path isolated from real mode; fixtures must never pass as real verification.
- Tests: expired/wrong/reused/rate-limited OTP creates no affiliation with safe retry guidance; simultaneous claims on one normalized email link to at most one account.

## D5 — Reviewer queue page
- Location: server-rendered page in `apps/web` (no separate service). Features: pending list, approve/reject + reason, audit columns (reviewer, timestamp, decision). Access: designated reviewer accounts only, RLS + server checks.
- Out of scope: assignment workflows, SLAs, delegation (needs product decision).

## D6 — Retention and operational targets
- Targets: 24h RPO / 4h RTO are ASPIRATIONAL until the first restore drill records measured numbers.
- Deletion: account deletion removes private Storage uploads (evidence/resumes) after a 30-day grace; DB-row retention and the safe account email-transfer procedure must be documented before real users.
- Tests/gates: restore drill evidence required before claiming targets; retention/upload policy reviewed before live release.

## D7 — Normalization
- Rule: `trim` + `lowercase` only. No Gmail dot rewriting, no plus-stripping. Raw input retained for audit/display; normalized value carries the global uniqueness constraint.
- Tests: `Example@Univ.edu` vs `example@univ.edu` collide (one account links); `first.last@` vs `firstlast@` do NOT collide.

## Permission matrix pointer
Full table x role matrix is in `docs/DECISIONS.md` ("Permission matrix (V1, 2026-10-10)"). Migration authors: every table listed there (`profiles`, `universities`, `university_domains`, `affiliations`, `projects`, `project_roles`, `collaboration_requests`, `project_memberships`, `conversations`, `conversation_members`, `messages`, `blocks`, `reports`, `outcome_notes`, plus private Storage objects) needs RLS policies matching its row before migration.

## Lifecycle invariants pointer
State machines and cross-cutting rules are in `docs/DECISIONS.md` ("Lifecycle invariants (V1, 2026-10-10)"). Key test hooks: faculty pending cannot claim reviewed status; decline silent to sender; withdrawal keeps intro consumed; closure terminal; no self-join; local-only enforced server-side; blocked pairs cannot contact.

## V1 exclusions (explicit, unchanged)
Recruiters, job boards, paid services/payments, social feed, followers/likes, events/clubs, courses, formal mentorship programs, AI assistant/BYOK, Jira-style task management. No adoption numbers, launch dates, uptime claims, or live SMTP credentials invented here.
