# Security requirements
Permission matrix for every resource; server-side plus RLS; anonymous users cannot access private account/email/evidence. Discovery depends on chosen visibility and active reviewed affiliation as appropriate.
Supabase session cookies handled using current SSR documentation; protect state-changing endpoints from cross-origin requests; no unsafe HTML rendering; schema-validate inputs; parameterized database queries.
Secrets from private environment/config only. No secrets in Git/logs/prototype. NEXT_PUBLIC variables are public. Server-only service credentials never sent to client.
Rate-limit verification, sign-in and requests by identity plus suitable network signal; use persistent shared enforcement, not per-process memory only. Avoid logging OTPs/email contents/evidence. Block/report are enforced server-side, not cosmetic buttons.
Upload feature gated until private authorization, size/type validation, retention/deletion and malware-handling policy exist. No 'not hackable' claims.
Threats: cross-account reads/writes, forged affiliation/roles, request spam, duplicate email linkage races, concurrent capacity oversubscription, sensitive logs, storage access leakage, compromised server credentials. Acceptance tests must cover them.
