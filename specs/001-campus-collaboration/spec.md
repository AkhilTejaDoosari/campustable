# CampusTable V1 product contract
Status: accepted product boundary; implementation details below are proposed until recorded in DECISIONS.
Primary actor: a university student seeking contributors for a concrete project. Alumni contribute or advise; faculty post research collaborations or advise.
Job: define useful work, find willing contributors or advisors, form a team, and begin.
Trigger: a project needs a skill, research contribution, or guidance the creator cannot supply alone.
Input: affiliation/profile, project problem, audience, goal, deliverable, observable success criteria, scope/exclusions, open roles/responsibilities, contribution, duration, eligibility, weekly commitment, meeting format, university boundary.
Output: accepted project membership with a clear role and commitment, and an accepted conversation.
Success: participants confirm a first working session or contribution. Account creation, an accepted request, and a team count are intermediate metrics, not proof of completed work.
Pilot: one real creator-led project, invited friends across universities, then relevant friends-of-friends. Discovery value requires a useful new connection. No invented adoption numbers or launch deadline.
Scope: students/alumni/faculty; role-adaptive onboarding; searchable skills/topics; optional participation preferences; project/research briefs; university filters; one introduction per pair before acceptance; accepted messages; open/filled roles; project closure; block/report; owner-controlled visibility.
Cross-university: all participating university projects default during pilot; optional actual university name filter. Project owners can restrict to their university. No separate database per university.
Non-goals: recruiters, job boards, paid services/payments, social feed, followers/likes, events/clubs, courses, formal mentorship programs, AI assistant/BYOK, Jira-style task management. Optional Leo mascot must not delay delivery.
Collaboration only: no employment, payments, contracts, or academic credit arranged by CampusTable. Do not represent faculty posts as institutionally approved research.
Trust: email access is not enrollment/employment proof; affiliation statuses are explicit. Private emails/evidence never appear in discovery. No guaranteed jobs, expertise, safety, or unhackability.
Constraints: new public campustable repo, Starkwolf application compute, Supabase Cloud Auth/Postgres/Storage, future DuckDNS/Caddy, no changes to existing server services during bootstrap.

# V1 user flows
1. Sign in with verified personal email; choose student/alumni/faculty.
2. Student verifies separate university mailbox. Alumni may supply university email/evidence optionally; graduation self-reported unless reviewed. Faculty verifies university mailbox and requires role review.
3. Complete role-specific academic fields and optional skills, topics, learning goals, participation and availability. Resume/LinkedIn/GitHub optional. Recruiter controls absent.
4. Draft project brief; save; validate required purpose/commitment fields; publish with specific open contributor/advisor roles.
5. Search projects by topic/skill, stage, university. Check eligibility and commitment. Send one meaningful introduction; awaiting response state.
6. Owner accepts or silently declines. Acceptance atomically creates agreed membership; private conversation opens. Decline is not announced to sender. One pair introduction remains enforced; withdrawing must not bypass it.
7. Owner fills/closes roles; team records self-reported start/outcome; members can leave. No tasks/sprints.
Failures: expired/incorrect OTP shows retry guidance; duplicate linked university email gives safe account-recovery guidance; unknown domain requires review, not automatic rejection or approval; faculty pending cannot claim approved access; missing brief focuses field; closed role/concurrent acceptance gives conflict and no duplicate membership; denied object returns safe unavailable state; dependency failure retains draft and offers retry.
Screens need explicit loading, empty, error, pending, success and keyboard states. Never treat demo fixtures as real verification.

# Observable acceptance criteria
Given anonymous caller, when reading private profile/email/evidence or changing another user, then deny without sensitive leakage.
Given university mailbox challenge, when expired/wrong/reused or rate-limited, then no affiliation created; safe retry guidance. Two simultaneous claims cannot link same normalized email to two accounts.
Given student/alumni/faculty, setup fields adapt and verification labels accurately distinguish mailbox access, self-report and review. Faculty pending cannot claim reviewed status.
Given blank brief, publishing refuses required field. Valid brief creates one project; retried publish does not duplicate.
Given cross-university user, local-only project forbids joining despite crafted request. University filters narrow only visible results; typed skills/custom topics work with keyboard.
Given open role/request, owner acceptance commits membership/conversation once. Concurrent acceptances never exceed capacity. Duplicate retry is safe. Decline not exposed as rejection to sender; withdrawal not bypass introduction constraint.
Given block or closed project, further prohibited contact/join is rejected. Member leave/removal has explicit tested state transitions.
Given failed dependency, show error and preserve draft; never claim saved when it failed.
Given completed milestone or self-reported outcome, identify it as self-report. Product success measured through a confirmed first contribution, not sign-up counts.
Before live release: migration/RLS tests, build/lint/typecheck, responsive keyboard UI checks, reviewed retention/upload policy, actual restore exercise. Separate automated test pass from manual observations.
