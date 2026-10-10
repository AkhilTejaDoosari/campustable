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
