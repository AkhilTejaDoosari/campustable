# Architecture
Next.js TypeScript App Router in apps/web: UI, authenticated route handlers/server actions, validation and application operations.
Supabase Cloud: Auth identities, Postgres relational source of truth and RLS, private Storage objects. Supabase DB compute differs from application compute.
Starkwolf runs application container; Caddy terminates HTTPS; DuckDNS points public app address. OpenCode stays localhost/tailnet only and is never publicly proxied.
Browser -> app HTTPS session; browser/app -> Supabase authenticated API; app -> privileged operations only server-side with narrowly justified access. No user-supplied AI credentials.
Use Supabase publishable browser key with RLS; never ship service-role key. Prefer session-scoped queries. Transactional membership operation lives in Postgres with explicit permission checks.
Before deployment: inspect actual capacity/ports/Caddy/UFW, document proxy routes/timeouts and blast radius. No automatic server installation or changes here.
