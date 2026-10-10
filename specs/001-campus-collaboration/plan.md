# Implementation plan
1. Inspect AGENTS, existing Spec Kit, repository state, prototype and all docs; reconcile conflicts using latest PRODUCT boundary. Record decisions and permission matrix before feature code.
2. Verify foundation and build; Supabase migrations/fixtures/RLS tests; account and adaptive onboarding; honest verification status and pending review.
3. Project brief/draft/publish/search and eligibility; role requests with atomic acceptance/team formation; accepted chat, block/report, closure and self-reported outcome.
4. Integration/E2E negative cases, accessible responsive UI; CI/Docker docs. No live deployment changes until inventory and runnable release prepared.
5. Finish all independent work with mocks explicitly isolated for test/demo; list blockers for Supabase credentials, SMTP and review workflow. Do not declare production-ready with simulated verification.

## Decision baseline (2026-10-10)
Routine V1 choices D1–D7 are settled in docs/DECISIONS.md with the permission matrix and lifecycle invariants; implementer detail lives in decisions-log.md in this directory. Live university-OTP delivery is BLOCKED on SMTP credentials (exact missing credential recorded in D4). Steps 2–4 above must conform to that baseline; any deviation needs a new product decision.
