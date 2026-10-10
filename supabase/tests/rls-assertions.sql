-- CampusTable V1 — RLS assertion script (REVIEW ONLY, pending live DB).
--
-- Status: SQL-review + procedure pending live run. NOT executed against a
-- live Supabase instance. Do NOT claim RLS coverage until this runs green on
-- a scratch database (local `supabase start` + `supabase db reset`, or a
-- throwaway cloud project).
--
-- How to run (requires the three migrations applied + three test users):
--   1. supabase start && supabase db reset
--   2. Create users: owner, applicant, stranger (record UUIDs below).
--   3. psql "$SUPABASE_DB_URL" -v owner='<uuid>' -v applicant='<uuid>' \
--        -v stranger='<uuid>' -f supabase/tests/rls-assertions.sql
-- Every block raises EXCEPTION on violation; a clean run ends with NOTICE
-- "rls-assertions: all checks passed". The whole script runs in one
-- transaction and ROLLBACKs, so it never mutates the database.
--
-- Conventions: tests call security-definer helpers only where the app does;
-- direct-table assertions use SET LOCAL ROLE authenticated + SET LOCAL
-- "request.jwt.claims" to impersonate each actor. Adjust the SET statements
-- to match your local Supabase auth schema if they differ.

BEGIN;

-- Sanity: migrations present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'accept_collaboration_request'
  ) THEN
    RAISE EXCEPTION 'rls-assertions: 0003_acceptance.sql not applied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'collaboration_requests_pair_uidx'
  ) THEN
    RAISE EXCEPTION 'rls-assertions: pair unique index missing (0001_init.sql)';
  END IF;
END $$;

-- 1. Anonymous callers are denied private reads.
-- (Run as anon; each SELECT must return 0 rows or raise insufficient_privilege.)
--   SET LOCAL ROLE anon;
--   SELECT count(*) FROM public.profiles;                    -- expect 0 / denied
--   SELECT count(*) FROM public.affiliations;                -- expect 0 / denied
--   SELECT count(*) FROM public.collaboration_requests;     -- expect 0 / denied
--   SELECT count(*) FROM public.messages;                   -- expect 0 / denied
--   RESET ROLE;

-- 2. Authenticated stranger cannot read another user's affiliations/challenges.
-- (Impersonate stranger via jwt claims; selects on applicant rows => 0 rows.)
--   -- SET LOCAL "request.jwt.claims" TO '{"sub": "<stranger>"}';
--   -- SELECT count(*) FROM public.affiliations WHERE user_id = '<applicant>';
--   -- expect 0.

-- 3. universities / university_domains are world-readable, never world-writable.
--   SET LOCAL ROLE anon;
--   SELECT count(*) FROM public.universities;  -- expect >= 0 (read allowed)
--   INSERT INTO public.universities (name) VALUES ('evil');  -- must fail
--   RESET ROLE;

-- 4. collaboration_requests: sender inserts, non-participant reads denied.
--   -- As applicant: INSERT a request row for own project role => success.
--   -- As stranger: SELECT that row => 0 rows; UPDATE => 0 rows affected.

-- 5. messages: member-only read; insert requires sender_id = auth.uid().
--   -- As stranger: SELECT on a conversation's messages => 0 rows.
--   -- As stranger: INSERT with sender_id = '<applicant>' => must fail.

-- 6. blocks/reports: users see only their own rows.
--   -- As stranger: SELECT FROM public.blocks => 0 rows (unless own).
--   -- As stranger: DELETE FROM public.blocks WHERE blocker_id = '<owner>'
--   --   => 0 rows affected.

-- 7. accept_collaboration_request is owner-only + capacity-safe (see also
--    race-assertions.sql for the concurrent procedure).
--   -- As applicant (non-owner): SELECT accept_collaboration_request('<req>')
--   --   => must raise forbidden (SQLSTATE 42501).

-- 8. projects visibility: `open`+`all` readable; `university_only` hidden
--    from unverified strangers, visible to verified members / participants.

SELECT pg_notify('rls-assertions', 'review script parsed; live run pending');
ROLLBACK;
