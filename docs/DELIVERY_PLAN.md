# Delivery plan and checkpoints

Principle: finish a coherent chunk, inspect its evidence, then authorize the next chunk. Do not ask the agent to build every phase in one prompt.
Perfection means explicit decisions and adequate evidence, not claiming zero defects or polishing one screen forever.

## Planning chunks — before production code

| Chunk                                            | Output                                                                                                                       | Exit checkpoint                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0A: Product and delivery contract — this package | PRODUCT, delivery plan, provisional configuration inventory, agent boundaries                                                | Primary actor/job, scope, trust rules and measurable success agree; remaining decisions are visible                                                     |
| 0B: Journeys and domain — drafts included        | USER_FLOWS, DOMAIN, initial DATA_MODEL, ACCEPTANCE                                                                           | Happy/refusal/failure paths, screen states, legal transitions, ownership and invariants are explicit                                                    |
| 0C: Architecture and operating contracts         | ARCHITECTURE, API, SECURITY, RELIABILITY, OBSERVABILITY, DEPLOYMENT, REPO_MAP, DECISIONS; finalize DATA_MODEL and ACCEPTANCE | All 13 pack files reviewed; dependency/configuration inventory complete; cost budget, retention, backup and release rules settled; pre-code gate passes |

The 13 files from playbook §128 live in docs/: PRODUCT, USER_FLOWS, DOMAIN, ARCHITECTURE, DATA_MODEL, API, SECURITY, RELIABILITY, OBSERVABILITY, DEPLOYMENT, REPO_MAP, DECISIONS, ACCEPTANCE.
Planning may include provider setup and technical feasibility checks. Do not silently turn a spike into production code. Collect real credentials privately as required, never insert them into design documents.

## Implementation slices — each includes real UI, backend and tests

| Slice                     | User result                                                                                                                 | Required evidence before moving on                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Account and identity   | Real signup/login/logout, session handling, recovery, verification delivery foundation                                      | Two accounts, valid/expired/reused codes, missing-config refusal, session expiry, real email delivery, cross-account denial; CI passes                                                 |
| 2: Community profiles     | Role-adaptive onboarding, distinct school-mail claim, affiliation status, university/skills input, owner-controlled profile | Duplicate school mail rejected atomically, no role spoofing, alumni/faculty states honest, private fields inaccessible, reload/login preserves profile                                 |
| 3: Projects and discovery | Complete persisted brief, draft/publish, roles, eligibility, university/topic search                                        | Non-owner edit refused, incomplete publish refused, empty/error/loading states, university boundary enforced, realistic real-record search                                             |
| 4: Team and conversation  | Apply/introduce, accept, atomic capacity/membership, permitted messaging, leave/removal/closure                             | Two real accounts finish the journey; concurrent last-slot accept cannot overfill; retry cannot duplicate membership; silent decline, withdrawal, blocking and message access enforced |
| 5: Pilot release          | Moderation, deletion/retention, deployment, visibility into failures and recovery                                           | Reviewer authorization tested, restore actually exercised, health/alerts checked, release rollback rehearsed, mobile/browser journey tested, pilot records are real                    |

Install the application scaffold and CI in Slice 1 after the planning gate. Basic abuse protections and block/report foundations enter at the first contact/upload feature, not only at launch. Slice 5 verifies the full operating process.
No automatic merging or production deployment. A passing slice commit is reviewable; next work is explicitly scoped. A failed slice is fixed in place, not replaced with another repository.

## Decisions that must be settled in 0B/0C

- Authentication method and recovery; personal-email changes; secondary school-mail verification must not create a second account or replace the personal login identity.
- Email normalization/domain ownership, multiple university domains, pending unknown domains, duplicate claims, re-verification expiry and reassignment after account deletion.
- Student date rules; alumni self-report labels; faculty reviewer authority, proof options and pending-role permissions. Avoid unnecessary sensitive documents.
- Who can discover whom across universities; public vs authenticated profile/project visibility; no automatic university data isolation unless explicitly required.
- Draft/open/filled/closed project transitions; application and intro states; already-connected project applications; leave/removal; retention after blocking/deletion; all transactional invariants.
- File types, size limits, private buckets, access URLs, evidence collection/retention and whether upload scanning is necessary for accepted file types.
- Browser/session/server authorization, RLS/grants, reviewer bootstrap, rate limits and abuse costs.
- API shapes, stable error codes, pagination, idempotency, concurrency and timeout/retry behavior.
- Development/staging/production separation, migrations, restore objectives, rollback, measured SLO targets, logging fields, alerts and spending thresholds.
- Email provider, sender identity/domain feasibility, ability to send to pilot addresses; do not assume the app's DuckDNS name solves sender authentication.

## Evidence rules

Report separately: implemented, executed and passed, executed and failed, not executed, and blocked.
Unit tests do not prove RLS. SQL written on disk is not an executed database test. A build is not browser QA. A migration applied is not a successful restore.
Use actual Postgres/Supabase for database permission and concurrency tests. Local email capture may test protocol behavior, but cannot prove delivery to a real university mailbox; both checks are needed in their proper environment.
Fixtures belong only in isolated automated tests. User-facing runtime never silently falls back to fixtures, localStorage-only persistence, fake OTP or fake sessions.

## UI conversion work in every slice

Use the exact supplied reference per UI_REFERENCE.md. Reuse embedded art and copy, port the approved UI into native components, and connect only real services. Compare reference and application at matching viewports. Backend work is substantial, but no new demo or redesign is required.

## Agent handoff policy

Use Spec Kit to structure the current slice, referencing accepted contracts. An agent may research and propose technical choices, but cannot override the product contract or mark an unresolved gate complete.
Each implementation handoff includes: one slice ID, dependencies ready, permitted paths/environment, required outcomes, negative/concurrency tests, stop boundary, and evidence report.
No implementation prompt is supplied yet. Next: review the included 0B contracts, complete 0C, then configure Slice 1 dependencies. Recruiters are definitively deferred from V1.
