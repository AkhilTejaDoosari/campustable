# Deployment — Vercel readiness

Status: prepared, not deployed. No production deploy from CI until this config is reviewed.

## Target

- Host: Vercel, project root `apps/web` (monorepo: set Root Directory to `apps/web`).
- Install command: `npm ci` (repo root; workspaces). If Vercel root is `apps/web`, use `npm ci --prefix ../..` — prefer root install with `apps/web` as Root Directory per Vercel monorepo docs.
- Build command: `npm run build --workspace @campustable/web` (resolves to `next build`).
- Node: 20.x.

## Environment variables (per environment: development / preview / production)

| Variable                          | Where       | Notes                                                                       |
| --------------------------------- | ----------- | --------------------------------------------------------------------------- |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | all         | Clerk instance key (dev vs prod instances differ)                           |
| CLERK_SECRET_KEY                  | server      | Rotate via Clerk dashboard                                                  |
| CLERK_WEBHOOK_SECRET              | server      | Svix endpoint secret for `/api/webhooks/clerk`                              |
| NEXT_PUBLIC_SUPABASE_URL          | all         | Dedicated Supabase project per environment; never prod data in preview      |
| NEXT_PUBLIC_SUPABASE_ANON_KEY     | all         | Browser-visible; RLS deny-by-default still applies                          |
| SUPABASE_SERVICE_ROLE_KEY         | server only | Webhook sync, verification RPC, signed uploads                              |
| RESEND_API_KEY                    | server      | Verified sender domain required before pilot sends                          |
| EMAIL_FROM                        | server      | e.g. `CampusTable <noreply@<verified-domain>>`                              |
| NEXT_PUBLIC_SENTRY_DSN            | all         | Empty string disables Sentry                                                |
| NEXT_PUBLIC_POSTHOG_KEY / HOST    | all         | Empty key disables capture                                                  |
| NEXT_PUBLIC_APP_URL               | all         | Canonical origin; must match Clerk redirect allowlist + Supabase URL config |
| OTP_PEPPER                        | server      | Random per environment                                                      |

## Callback / webhook URLs to register

- Clerk redirect allowlist: `{APP_URL}/sign-in`, `{APP_URL}/sign-up`, `{APP_URL}/dashboard`.
- Clerk webhook endpoint: `{APP_URL}/api/webhooks/clerk`, subscribed to `user.created`, `user.updated`, `user.deleted`.
- Supabase Auth: not used (no redirect config needed). Supabase URL config allowlist still lists `{APP_URL}` for storage signed-URL flows if applicable.
- Resend: verify sender domain DNS (SPF/DKIM) before pilot; test sender only for dev.

## Assumptions

- One Vercel project per repo; preview deployments share a disposable Supabase project, production uses its own.
- Secrets injected at runtime via Vercel env, never baked into the build output.
- Migrations applied via Supabase CLI from a maintainer machine/CI with scoped credentials, never from the browser.
