# Deployment boundary
Target: Starkwolf Docker application + Caddy HTTPS + DuckDNS, Supabase Cloud services. Port and resource budget selected after actual read-only inventory.
Bootstrap does not deploy or edit running Caddy/firewall/OpenCode services. Preview development binds localhost; public app must be separately authenticated/authorized.
CI: lockfile install, lint, typecheck, domain/RLS tests, build; later image build/publish and deployment over existing private access. Use least privilege secrets; no paid subscription enabled implicitly.
Rollback to prior image while preserving compatible schema; expand/contract migrations. Do not run destructive migrations or wipe real database. Document deploy and restore commands with actual paths before release.

## Local preview (no credentials needed)

```bash
cd apps/web
npm ci
npm test        # hermetic node:test suite (no network, no DB)
npm run dev     # http://localhost:3000 (uses .env.local if present; never commit it)
```

## Container image (apps/web/Dockerfile)

```bash
# From the repo root:
docker build -f apps/web/Dockerfile -t campustable-web .
# Run with runtime env only (file lives OUTSIDE the repo, e.g. /private/...):
docker run --rm -p 3000:3000 --env-file /private/path/.env.local campustable-web
```

No secrets are baked into the image. Required runtime env (names only, no
values): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
plus any SMTP variables once a provider is chosen (see BLOCKERS.md).

## Database restore drill (pending live project)

1. `supabase link --project-ref <ref>` (access token from private env only).
2. `supabase db reset` locally until green, then `supabase db push`.
3. Restore exercise: `supabase db dump -f /private/path/backup.sql` before any
   risky change; restore to a scratch project and re-run
   `supabase/tests/rls-assertions.sql` + `race-assertions.sql`.
4. Never auto-apply to an unknown cloud project; never reuse another app's
   database. Destructive migrations and wipes are forbidden on real data.
