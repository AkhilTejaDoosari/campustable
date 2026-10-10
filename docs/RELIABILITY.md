# Reliability proposals
Dependencies: Supabase Auth/DB/Storage, email transport, DuckDNS, Caddy. Define bounded timeouts and user-visible degradation.
Read-only operations can retry bounded transient errors; mutations only with documented idempotency. Pending UI never claims success before committed result. Preserve drafts on failures.
Before real pilot, measure health/readiness and propose achievable availability/latency SLOs; do not invent achieved uptime. No HA claim for single VPS.
Backups: encrypted off-host logical DB backups plus separate Storage file backups; schedules, retention, restore drill and credentials documented. Provider database dump excludes actual Storage bytes.
