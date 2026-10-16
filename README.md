# CampusTable — application foundation (architecture LOCKED 2026-10-16)

Real Next.js + TypeScript monorepo. No demo, no fixtures in production paths.

- Product contract: docs/PRODUCT.md. Architecture: docs/ARCHITECTURE.md. Decisions: docs/DECISIONS.md (ADR-001..ADR-011).
- UI baseline: docs/UI_REFERENCE.md; design/approved-demo-reference.html is the archived visual reference only.
- App: apps/web (Next.js App Router). Shared packages: packages/_. Schema: supabase/migrations/_.sql.
- Locked stack: Next.js+TS+Tailwind+shadcn/ui; Clerk (identity); Supabase Postgres+Storage; Resend; Sentry; PostHog; Vercel; GitHub Actions.

## Run locally

Requires Node >= 20.9. Copy env template first (never commit real values):

```
cp apps/web/.env.example apps/web/.env.local   # then fill privately, chmod 600
npm install
npm run typecheck --workspaces --if-present
npm run lint --workspaces --if-present
npm run test --workspaces --if-present
npm run build --workspaces --if-present
npm run dev --workspace @campustable/web
```

Keyless `next build` is intentional: public pages prerender without secrets; auth-gated routes are
force-dynamic and fail closed at runtime. Real Clerk/Supabase/Resend credentials are still required
for authenticated flows, verification email, and database access — see docs/DEPLOYMENT.md.
