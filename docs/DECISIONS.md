# Decisions
Accepted: project-first collaboration; students primary with alumni/faculty; no recruiters/payments/feed/AI/tasks in V1; required project purpose/observable success criteria; multiple universities with explicit visibility; Starkwolf + Supabase Cloud + DuckDNS; retain new public campustable repo (brand rename independent).
Proposed: PostgreSQL transaction boundary for acceptance; immutable pair intro limit; final role capacity model; university challenge delivery provider; verification reviewer interface; retention/deletion timelines; operational targets.
Agent may settle routine implementation choices within scope, record rationale and revisit trigger. Missing external credentials/provider setup are blockers, not permission to invent live services. No large additions without a new product decision.

## Settled (2026-10-10)

Routine V1 implementation choices below are settled for implementers. Each entry gives choice + rationale + revisit trigger. Nothing here is production-ready; live paths stay BLOCKED until the stated credential/drill exists. V1 exclusions remain: recruiters, job boards, paid services/payments, social feed, followers/likes, events/clubs, courses, formal mentorship programs, AI assistant/BYOK, Jira-style task management.

### D1. Acceptance transaction boundary — SETTLED
- Choice: `accept_collaboration_request(request_id)` Postgres function is THE transaction boundary for request acceptance. It performs (inside one transaction): caller-is-project-owner authorization check, `SELECT ... FOR UPDATE` on the `project_roles` row, state checks (request still `pending`, role still `open`, project still accepting), capacity check (D3), idempotency check (request already `accepted` returns the existing membership/conversation without duplicating), then inserts/ensures `project_memberships` row + `conversations`/`conversation_members` rows and marks the request `accepted`. Any failure rolls back everything; the function returns typed machine errors (`forbidden`, `conflict`, `validation`) per docs/API.md.
- Rationale: acceptance spans request + membership + conversation rows and must survive retried publishes/clicks and concurrent owner actions without double-membership or orphan conversations; only a DB-side transaction with row-level locking guarantees this under RLS + app-layer retries.
- Revisit trigger: revisit only if load testing proves function-level serialization is a bottleneck, or if Supabase Postgres version changes advisory-lock/RLS behavior relied upon here.

### D2. Pair-intro limit — SETTLED
- Choice: exactly one pre-acceptance introduction per account pair, immutable. Enforced by a normalized `LEAST(requester_id, addressee_id)` / `GREATEST(...)` pair unique index on the introductions record covering ALL statuses including `declined` and `withdrawn` — withdrawing or being declined never frees a second intro. Already-connected users (an accepted pair) who apply to another project create a project-scoped application row referencing the new project/role WITHOUT a second pair intro; messaging for the new project reuses the existing pair conversation grant (a project-scoped thread linked to the same pair, not a new intro).
- Rationale: USER_FLOWS requires "one pair introduction remains enforced; withdrawing must not bypass it" while DOMAIN requires already-connected users to still apply to further projects; a status-blind pair index plus a distinct project-scoped application path satisfies both without a bypass.
- Revisit trigger: revisit only on a new product decision permitting re-introduction (e.g. time-boxed expiry); that would be a scope change, not a routine choice.

### D3. Role capacity model — SETTLED
- Choice: `project_roles.capacity` is a positive integer per role row (default 1). Acceptance fails with `conflict` when `count(active memberships for role) >= capacity`. Concurrent acceptances are serialized by `SELECT ... FOR UPDATE` on the `project_roles` row inside `accept_collaboration_request`; the count check and insert happen while holding that lock. Closing/filling a role (`open` -> `filled`/`closed`) is owner-only and also takes the role lock.
- Rationale: integer-per-role is the smallest model satisfying "concurrent acceptances never exceed capacity" (ACCEPTANCE.md) without a separate quota service; serializing on the role row keeps the check-and-insert atomic.
- Revisit trigger: revisit if V1 needs multi-role bundles, waitlists, or capacity > 1 with partial fills as distinct states — needs product input.

### D4. University challenge delivery — SETTLED with live path BLOCKED
- Choice: university mailbox challenge is a 6-digit numeric OTP delivered by a real SMTP provider (vendor UNDECIDED; candidates: Resend, Supabase Auth email). Stored as `sha256` `code_hash` only (never plaintext), 15-minute expiry, max 5 verification attempts per challenge, per-email send rate limit with persistent shared enforcement (not per-process memory). University OTP is separate from personal sign-in; Supabase Auth email-change is NOT an ownership-verification shortcut. Test/demo mode may use a deterministic hash but every such code path and fixture MUST be labeled `SIMULATED` and isolated from real mode; never silently simulate in real mode.
- Status: live delivery BLOCKED until SMTP credentials are supplied. Exact missing credential: a transactional-email provider API key / SMTP username+password (for whichever candidate is chosen) stored in private server environment — none exists in this repo, and none may be committed to Git.
- Rationale: API.md already marks "missing SMTP is a blocker for live verification"; sha256-hash + short expiry + bounded attempts + rate limit is the minimum credible mailbox-ownership check without building a custom mailer.
- Revisit trigger: revisit vendor choice once credentials exist; revisit OTP length/expiry only on measured abuse or accessibility evidence.

### D5. Reviewer interface — SETTLED
- Choice: minimal server-rendered queue page inside `apps/web` for affiliation/faculty review (list pending, approve/reject with reason, audit fields: reviewer, timestamp, decision). No separate service, no separate repo, no background worker. Access restricted to designated reviewer accounts; all decisions server-side + RLS-enforced.
- Rationale: review volume in V1 pilot is human-scale (one creator-led project outward); a queue page avoids operating a second service on Starkwolf for a CRUD approval flow.
- Revisit trigger: revisit if review SLA/volume requires assignment workflows, SLAs, or delegation — needs product decision.

### D6. Retention, deletion, and operational targets — SETTLED (targets aspirational)
- Choice: backup recovery targets are 24h RPO / 4h RTO, ASPIRATIONAL until the first actual restore drill passes — do not claim them as met. Account deletion: uploads (evidence/resumes in private Storage) are deleted with the account after a 30-day grace period; DB rows follow the documented retention/deletion policy (to be written before real users). Safe account email-transfer procedure must be documented before enabling real users (per DATA_MODEL.md).
- Rationale: DATA_MODEL.md proposes 24h/4h as targets "validate feasibility"; without a restore exercise they are goals, not guarantees. The 30-day grace balances accidental-deletion recovery against storage of sensitive evidence.
- Revisit trigger: revisit RPO/RTO after the first restore drill with measured numbers; revisit grace period on legal/privacy advice.

### D7. Email normalization — SETTLED
- Choice: normalization is `trim` + `lowercase` only. No Gmail dot rewriting, no plus-address stripping, no provider-specific canonicalization. The normalized value carries the global uniqueness constraint for affiliation emails; the raw input is retained alongside for audit/display where needed.
- Rationale: provider-specific rewriting (e.g. Gmail dots) risks merging distinct mailboxes a university may treat as distinct, and creates false "already linked" conflicts; trim+lowercase is predictable and documentable.
- Revisit trigger: revisit only with evidence of duplicate-account abuse via case/whitespace variants that trim+lowercase already covers, or a documented university request with exact rewriting rules.

## Permission matrix (V1, 2026-10-10)

Columns: Anonymous (unauthenticated) | Member (authenticated, not a party to the row) | Owner/party (the privileged actor for that row: profile owner, project owner, conversation participant, report author, affiliation claimant) | Reviewer/service (designated faculty/affiliation reviewer or server-side privileged function only — never client-reachable service-role).
Enforcement is server-side + RLS on every row; "deny" returns safe `unauthenticated`/`forbidden`/`unavailable` without leaking existence of private rows. V1 has no general admin role; "Reviewer/service" is narrowly scoped per row below.

| Table | Anonymous | Member (non-party) | Owner / party | Reviewer / service |
|---|---|---|---|---|
| profiles | deny (private fields never in discovery) | read only public/discoverable fields per owner's visibility + active affiliation where applicable; no write | read/write own profile | no special access (service may read for moderation only) |
| universities | read published list (for filters/onboarding) | read | no owner concept (reference data) | reviewer reads; writes via reviewed domain-mapping process only |
| university_domains | read exact-domain allowlist as needed for onboarding UX (no private data) | read | no owner concept | reviewer approves/rejects mappings |
| affiliations | deny | deny (never read another account's emails/evidence; discovery sees only status label where applicable) | claimant: create own, read own, no self-approve | reviewer: read queue, approve/reject; service function links verified mailbox |
| projects | read only published/discoverable projects passing visibility + eligibility filters | read discoverable; no write to others' | project owner: create/update/close own, manage roles/requests | reviewer: no project access except via report queue |
| project_roles | read roles of discoverable projects | read roles of discoverable projects; no write | project owner: create/fill/close roles on own project (role lock) | none |
| collaboration_requests | deny | create intro/application where eligible; read own sent/received-as-owner only; withdraw own pending | project owner: accept/decline requests on own project (accept via D1 function only) | none |
| project_memberships | deny | read memberships of own projects only; leave own membership | project owner: remove member from own project (explicit transition); member: leave own | none |
| conversations | deny | read/list only conversations the caller is a member of | member: read/send in own conversations | none (service creates rows inside D1 txn) |
| conversation_members | deny | read membership of own conversations only | managed by D1 function + owner removal side effects; no direct client write | service manages inside D1 txn |
| messages | deny | read/send only in own conversations; blocked pairs rejected server-side | same as member (participant) | none |
| blocks | deny | create/read/delete own blocks only | same (caller is owner of their block rows) | none |
| reports | deny | submit report; read own submitted reports only | report author reads own | reviewer reads triage queue; writes moderation outcome |
| outcome_notes | deny | read outcomes of projects they are members of; write only for own projects' self-report | project owner/member authors self-reported outcome (labeled self-report) | none |
| Storage objects (evidence/resumes, private) | deny | deny unless signed-URL grant for own objects or reviewer grant for review queue item | owner: upload/read/delete own via signed access; type/size validated | reviewer: time-boxed read of evidence attached to a pending review only |

Notes: private emails/evidence never appear in discovery (PRODUCT.md trust rule). Blocked pairs cannot contact: message send and new intro/application from either direction are rejected server-side while a block is active. Denied reads return safe `unavailable` without confirming existence.

## Lifecycle invariants (V1, 2026-10-10)

1. Affiliation: `self_reported` -> `pending` -> `verified` / `rejected`. `mailbox_verified` (OTP proves mailbox access) is distinct from faculty/affiliation `reviewed`. Faculty accounts require BOTH mailbox verification AND role review before claiming reviewed status; pending faculty cannot claim approved access.
2. Project: `draft` -> `open` -> `in_progress` -> `completed` / `closed`. No backwards reopening without an explicit rule (none in V1 — closure is terminal). Only `open` projects accept new requests.
3. Role: `open` -> `filled` / `closed`. Closed/filled roles reject acceptance with `conflict`; only the project owner transitions roles.
4. Request: `pending` -> `accepted` / `declined` / `withdrawn`. Acceptance is owner-only, atomic via D1. Decline is silent to the sender (requester sees non-accepted state, never a rejection announcement). Withdrawal keeps the D2 pair-intro consumed.
5. Membership: `active` -> `left` / `removed`. Leave is self-only; remove is project-owner-only. Removal/leave does not reopen the pair intro and does not itself delete conversation history.
6. Cross-cutting: no requester self-join (owner cannot request own project); local-only eligibility enforced server-side despite crafted requests; closed roles cannot accept; blocked pairs cannot contact; no duplicate active membership per (project, user) — unique constraint.
7. Canonical school email globally unique on the normalized (trim+lowercase) value; simultaneous claims are race-tested so two accounts can never link the same normalized email.
