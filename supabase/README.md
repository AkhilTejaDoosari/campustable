# Supabase — CampusTable V1

Versioned SQL in `migrations/`: `0001_init.sql` → `0002_rls.sql` → `0003_acceptance.sql`.
Test notes in `tests/` are SQL-review + procedure pending live run.

## Apply to local Supabase

```bash
supabase start
supabase db reset   # applies migrations in order to local Postgres
```

Verify: `SELECT * FROM pg_tables WHERE schemaname='public';`

## Apply to cloud (only when creds exist)

1. `supabase link --project-ref <ref>` (requires access token in private env, never in Git).
2. `supabase db push` after `db reset` passes locally.
3. Never auto-apply to an unknown cloud project; never reuse another app's database.

## Notes

- No privileged server keys are used anywhere in SQL or docs.
- OTP/challenge codes are never logged; only `code_hash` is stored.
- Email canonical form: `trim + lowercase`, no Gmail dot rewriting.
