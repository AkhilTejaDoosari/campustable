# Application operation contracts
Specify auth, object authorization, input/output, machine errors, pagination, idempotency and side effects for:
profile get/update; affiliation verification start/confirm/review; project draft/create/publish/update/close; role fill/close; project list/get; request create/withdraw/accept/decline; membership leave/remove; conversation list; message send/list; block/unblock; report submit; outcome record.
Use schema validation (Zod). Deny unauthorized requests server-side and at DB layer. No UI-only security.
Pagination: proposed cursor with stable timestamp+ID ordering, bound page size. Mutation retry must not duplicate projects/messages/requests. Concurrent role acceptance tested transactionally.
Errors: validation, unauthenticated, forbidden/unavailable, conflict, rate_limited, dependency_unavailable. Avoid leaking whether an unrelated email/account exists.
University OTP is separate from personal sign-in: Supabase Auth email-change is not a school-email ownership verification shortcut. Need a real transactional email transport, hashed short-lived challenge, bounded attempts/rate limit and uniqueness linkage. Missing SMTP is a blocker for live university verification; never silently simulate in real mode.
