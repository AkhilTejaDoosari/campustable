# Deployment boundary
Target: Starkwolf Docker application + Caddy HTTPS + DuckDNS, Supabase Cloud services. Port and resource budget selected after actual read-only inventory.
Bootstrap does not deploy or edit running Caddy/firewall/OpenCode services. Preview development binds localhost; public app must be separately authenticated/authorized.
CI: lockfile install, lint, typecheck, domain/RLS tests, build; later image build/publish and deployment over existing private access. Use least privilege secrets; no paid subscription enabled implicitly.
Rollback to prior image while preserving compatible schema; expand/contract migrations. Do not run destructive migrations or wipe real database. Document deploy and restore commands with actual paths before release.
