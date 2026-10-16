# CampusTable engineering rules

Current state: architecture LOCKED 2026-10-16 (docs/ARCHITECTURE.md, docs/DECISIONS.md ADR-001..ADR-011). Application foundation scaffolded (apps/web + packages/\* + supabase/migrations). Read README.md and docs/PRODUCT.md first.
The current task boundary is planning. Do not install frameworks, write production code, create a demo, change Git remotes or apply cloud migrations unless a later slice instruction explicitly authorizes it. The 2026-10-16 foundation slice explicitly authorized scaffolding + identity/data/email/observability/analytics integration; further product verticals still require explicit slice authorization.
Work one coherent slice at a time. Do not jump to later slices or stop at a plan when the authorized slice requires implementation.
Keep docs current alongside code. Resolve ambiguity in the relevant design contract before implementation. Label proposals and decisions separately.
Use Spec Kit for the authorized slice; it does not replace the product contract or pre-code gate.
Secrets are not agent context: do not read .env/.env.local, print values, or copy credentials into docs/prompts. Inspect .env.example and sanitized presence checks only.
Real UI talks to real services. No production fixtures, fake OTP, browser-granted verification, mock auth or localStorage as the authoritative database. Isolated test fixtures are allowed.
Use installed versions and official documentation. Pin the resolved dependency versions/lockfile when scaffolding is authorized. Do not bulk upgrade unrelated tools or global plugins.
Enforce object-level permissions and database constraints, not only UI hiding. Test negative access, retries and concurrency with actual relevant services.
Do not reset existing work or rebuild repositories to hide a failure. Report exact blockers, completed behavior and checks that actually ran.
No production deployment, unrelated server changes, public OpenCode exposure or unsupported readiness claims.

Read docs/UI_REFERENCE.md before work. Preserve the exact approved UI except documented runtime-copy changes and explicitly resolved scope changes. Recruiters are deferred from live V1; preserve them only in the unchanged archived reference.
