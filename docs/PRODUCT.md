# CampusTable V1 product contract

Status: working contract. The newly supplied exact UI reference is authoritative for appearance and ordinary product copy. Recruiters, talent discovery and shortlists are explicitly deferred from V1 by the user on 2026-10-10. Read UI_REFERENCE.md. Pending operating rules are listed in DELIVERY_PLAN.md; do not invent them in code.

## Actor, job and pain

Primary actor: a university student with a concrete project who lacks a contributor or advisor.
Job: find willing people for clearly defined work, agree on the contribution, form a team and start working.
Pain: generic networking does not establish who is willing to contribute, what the work is, or what commitment is expected.
Alumni can contribute or advise. Faculty can advise or publish a research collaboration. Their roles use the same project workflow with distinct profile and affiliation states.

## Trigger, input and output

Trigger: the creator cannot supply all the skills or guidance a project needs.
Required project input: problem, intended audience, goal, deliverable, observable success criteria, scope and exclusions, roles and responsibilities, contribution expected, duration, weekly commitment, meeting format and eligibility/university boundary.
Required member input: verified personal account and role-adaptive profile. Current students additionally supply a distinct school email and verify control of it. Alumni without an active school email can self-report their affiliation; no automatic verified alumni badge. Faculty affiliation/role review is distinct from mailbox verification.
Optional inputs: skills/topics, willingness to discuss/practice/share resources/contribute/advise, resume, LinkedIn, GitHub and portfolio. Do not require coding profiles for non-coding members.
Output: an accepted project member with a defined contribution and a permitted conversation. Team membership is not employment or an academic-credit agreement.

## V1 scope

- Personal account, student/alumni/faculty onboarding, explicit affiliation states.
- University-name autocomplete and typeable searchable multi-skill/topic selection.
- Clear project/research brief, publication, discovery and role applications.
- Cross-university discovery during the pilot; actual university-name filter, initially the member's university in people search where appropriate. Projects may restrict participation to their university. Final defaults and access rules belong in USER_FLOWS.
- One introductory message per pair before acceptance; accepted conversations.
- Defined project membership, open/filled roles, leave/removal, closure and self-reported first contribution.
- Block/report and a minimal real reviewer/admin process for the features that require moderation.
- Top navigation and the accepted warm student visual direction implemented as actual UI, with usable contrast and mobile layouts.

## Observable success

Technical release success: two distinct authenticated accounts can complete onboarding, create/discover a real persisted project, apply, accept within capacity and exchange permitted messages. Refresh/login must preserve state. Unauthorized access is rejected.
Product pilot success: at least one real project team confirms a first work session or contribution. Record whether people already knew each other; a useful new connection is discovery evidence. These are initial evidence targets, not proof of market fit.
Do not invent adoption, uptime or employment results.

## Trust rules

- Account authentication, mailbox control and role/enrollment verification are different facts. School-email OTP is not university SSO and does not prove current enrollment.
- School-email ownership cannot be attached to multiple accounts. Re-verification of the same owner's mailbox is allowed under abuse limits. Reassignment/deletion rules must be decided before schema implementation.
- Private email, verification evidence and secrets never appear in discovery or logs.
- A profile date is not proof of enrollment. Past graduation dates guide a member toward alumni onboarding without claiming fraud detection. Exact validation is specified in Phase 0B.
- Browser fields cannot grant verification, admin privileges, membership or message access. Authorization is enforced server-side and in database policy/constraints where applicable.
- An unavailable email provider must leave verification pending/failed. Never return a fake success or universal test OTP in the real app.
- Declines remain silent to the sender. Repeated/withdrawn introductions must not bypass the per-pair limit. Blocking stops permitted contact under explicit rules.
- No guarantee that a member is skilled, employed, safe or enrolled; no promise that the service is unhackable.

## Non-goals and differentiation

No recruiter/job board: first prove project collaboration, not candidate sourcing.
No feed/followers/likes: discovery is organized around willingness and work, not attention.
No payments or paid/unpaid service marketplace: financial arrangements are outside V1.
No events/clubs/courses/formal mentorship program: avoid a second product workflow.
No AI/BYOK assistant: manual discovery comes first. Optional Leo mascot is cosmetic and cannot delay delivery.
No Jira tasks/sprints: CampusTable forms the team and starts the work; it does not replace a delivery tracker.
Not a LinkedIn resume network or a Discord chat server. Its unit of value is a clear project and a willing contributor.

## Constraints

One developer working on Mac with OpenCode, supported by a mentor. Small pilot before public launch. No invented schedule.
Accepted stack (LOCKED 2026-10-16, see ARCHITECTURE.md / DECISIONS.md): Next.js + TypeScript + Tailwind + shadcn/ui; Clerk for identity; Supabase Cloud Postgres/Storage (Supabase Auth not used); Resend for application email; Sentry; PostHog; Vercel hosting; GitHub Actions CI. AI is provider-abstraction only, not a V1 dependency. Cloudflare deferred.
Budget: minimize cost; actual limits and email sending costs must be checked before provider selection. No paid account activated automatically.
Do not alter unrelated projects or running Starkwolf services. OpenCode remains private and is never the app's public backend.
