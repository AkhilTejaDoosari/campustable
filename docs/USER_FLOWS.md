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
