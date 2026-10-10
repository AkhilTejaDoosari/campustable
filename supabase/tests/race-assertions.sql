-- CampusTable V1 — race / idempotency assertion script (REVIEW ONLY, pending live DB).
--
-- Status: SQL-review + procedure pending live run. NOT executed against a
-- live Supabase instance. Do NOT claim concurrency coverage until the two
-- concurrent procedures below run against a scratch database.
--
-- How to run:
--   1. supabase start && supabase db reset
--   2. Session A and B: psql "$SUPABASE_DB_URL" (two terminals, barrier via
--      manual COMMIT, or pgbench -c2 with the statement files noted below).
--   3. Wrap each procedure in BEGIN; ... COMMIT; and assert the outcomes.
-- The script itself only contains the single-session idempotency replays
-- (safe to run); concurrent steps are documented procedures, not runnable
-- from one session. Ends with ROLLBACK.

BEGIN;

-- A. Duplicate normalized email: app normalizes (trim+lowercase) before
--    insert; UNIQUE(affiliations.normalized_email) is the backstop.
--    CONCURRENT PROCEDURE (two sessions, same canonical email):
--      A: BEGIN; INSERT INTO affiliations(user_id, normalized_email, ...)
--         VALUES ('<user-a>', 'foo@univ.edu', ...);
--      B: BEGIN; INSERT INTO affiliations(user_id, normalized_email, ...)
--         VALUES ('<user-b>', 'foo@univ.edu', ...);
--      A: COMMIT;  -- succeeds
--      B: COMMIT;  -- must fail with unique_violation (23505)
--    ASSERT: SELECT count(*) FROM affiliations
--            WHERE normalized_email = 'foo@univ.edu';  -- expect 1.

-- B. Concurrent capacity acceptance: role capacity=1, requests R1 + R2.
--    CONCURRENT PROCEDURE (owner, two sessions):
--      A: BEGIN; SELECT accept_collaboration_request('R1');  -- hold
--      B: BEGIN; SELECT accept_collaboration_request('R2');  -- blocks on
--         role FOR UPDATE, then raises after A commits
--      A: COMMIT;  -- ok, role -> filled
--      B: COMMIT;  -- must raise conflict (SQLSTATE P0001,
--         'conflict: role capacity exceeded' or 'role ... is not open')
--    ASSERT: active memberships for role_id <= capacity AND status='filled'.

-- C. Single-session idempotent replays (runnable here once fixtures exist).
--    Each replay must return the SAME id without creating duplicates.
--    -- Accept twice:
--    --   SELECT accept_collaboration_request('<accepted-req>');  -- 1st
--    --   SELECT accept_collaboration_request('<accepted-req>');  -- 2nd, same id
--    --   SELECT count(*) FROM project_memberships
--    --     WHERE project_id='<proj>' AND user_id='<applicant>';  -- expect 1
--    -- Retry project create with same idempotency_key:
--    --   INSERT INTO projects(owner_id, title, idempotency_key, ...)
--    --     VALUES (...) ON CONFLICT DO NOTHING;  -- 0 rows on retry
--    -- Retry message send with same idempotency_key:
--    --   INSERT INTO messages(conversation_id, sender_id, body, idempotency_key)
--    --     VALUES (...) ON CONFLICT DO NOTHING;  -- 0 rows on retry

-- D. Pair uniqueness across states (single-session, runnable).
--    -- INSERT INTO collaboration_requests(from_user, to_user, project_id, ...)
--    --   VALUES ('<a>', '<b>', '<proj>', ...);            -- ok (withdrawn)
--    -- UPDATE collaboration_requests SET status='withdrawn' WHERE ...;
--    -- INSERT INTO collaboration_requests(from_user, to_user, project_id, ...)
--    --   VALUES ('<b>', '<a>', '<proj2>', ...);           -- must fail 23505
--    --   (collaboration_requests_pair_uidx covers ALL statuses)

SELECT pg_notify('race-assertions', 'review script parsed; live run pending');
ROLLBACK;
