# CampusTable V1 — blockers and evidence report

Date: 2026-10-10 · Branch: `feat/campustable-v1` · Scope: tests + CI + container/docs (V1 exclusions intact: no recruiter, payments, feed, AI, events, task management).

## 1. Automated pass (runnable today, hermetic)

`apps/web` unit suite — plain `node:test`, zero new dependencies:

| File | Covers |
|---|---|
| `tests/email-normalization.test.mjs` | trim+lowercase, **no dot rewriting**, schema coercion |
| `tests/otp.test.mjs` | OTP format/hash/verify, **expiry boundary**, **attempt cap** |
| `tests/idempotency.test.mjs` | key extraction rules, key uniqueness, SIMULATED duplicate-safe retry |
| `tests/request-visibility.test.mjs` | **silent decline** (sender sees `pending`) |
| `tests/eligibility-roles.test.mjs` | **local-only rejection**, closed/filled-role conflict, terminal stages |
| `tests/pair-intro.test.mjs` | SIMULATED pair-immutability model + migration contract assertion |
| `tests/pagination.test.mjs` | limit bounds (1–50, default 20), malformed cursors, next-cursor rules |

Result at time of writing: **62 tests, 62 pass, 0 fail** (`npm test` in `apps/web`).
CI (`.github/workflows/ci.yml`): lockfile `npm ci` → lint → typecheck → tests → build.
DB review scripts (NOT executed): `supabase/tests/rls-assertions.sql`, `supabase/tests/race-assertions.sql` — parse-checked by review only, each ends in `ROLLBACK`.

## 2. Manual observations (not automated — do not treat as test evidence)

- `npm run lint` / `npm run typecheck` status: see verification log below (re-run before handoff).
- `npm run build`: exercised only via CI; no local build artifact is claimed here.
- RLS matrix (`supabase/tests/permissions.md`) and race procedures (`supabase/tests/race.md`): SQL-review only, **pending live DB**.
- Pair-intro and duplicate-safe store unit tests are **SIMULATED** models of the Postgres constraints, not live concurrency proofs.

## 3. Blockers — exact missing credentials (nothing here is committed)

1. **Supabase project credentials** — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key only; service-role keys stay out of the repo and out of the browser). Needed for: live auth, applying migrations to cloud, running the RLS/race assertion scripts.
2. **SMTP / transactional-email provider + key** — provider choice plus server-only key (e.g. `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` or provider API key, exact names TBD at selection). Until this exists, university OTP delivery stays **SIMULATED** (`sendChallengeEmail` stub) and live affiliation verification must remain unavailable.
3. **Reviewer account bootstrap** — three test identities (owner, applicant, stranger) plus anon access on a scratch project, required by the RLS/race procedures. No real user data; scratch project only.

## 4. Exact local preview command (no credentials needed)

```bash
cd apps/web && npm ci && npm test && npm run dev
# open http://localhost:3000
```

Container preview: `docker build -f apps/web/Dockerfile -t campustable-web .` from the repo root, then `docker run --rm -p 3000:3000 campustable-web` (add `--env-file` only when credentials exist; never commit the file).

## 5. What is NOT claimed

No production readiness. No live-DB verification. No real email delivery. Secrets were not added (verified: `git status` shows no `.env*` additions; `.gitignore` covers `.env*`).
