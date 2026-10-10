# Race / idempotency tests — procedure pending live run

> Status: SQL-review + procedure pending live run. NOT executed against live DB.

## 1. Duplicate normalized email

Goal: two simultaneous claims cannot link the same canonical email to two accounts.

Procedure:
1. Users A and B both insert into `affiliations` with emails differing only by
   case/whitespace (e.g. `Foo@Univ.edu` vs `  foo@univ.edu `) after app-layer
   `trim+lowercase` normalization — both become `foo@univ.edu`.
2. Fire both inserts concurrently (two `psql` sessions, `BEGIN; INSERT; COMMIT`
   with a barrier, or `pgbench -c2`).
3. Expect: exactly one succeeds; the other fails with unique violation on
   `affiliations.normalized_email`.
4. Assert `SELECT count(*) FROM affiliations WHERE normalized_email='foo@univ.edu'` = 1.

Note: app MUST normalize before insert; DB unique index is the backstop.

## 2. Concurrent acceptance vs role capacity

Goal: concurrent `accept_collaboration_request` calls never exceed `capacity`.

Procedure:
1. Project with one role `capacity=1`; two pending requests R1, R2 for it.
2. As owner, call `SELECT accept_collaboration_request('R1')` and `(… 'R2')`
   concurrently from two sessions.
3. Expect: one succeeds; the other raises `conflict: role capacity exceeded`
   (or `role … is not open` after fill), because the role row is locked
   `FOR UPDATE` inside the function.
4. Assert active memberships with that `role_id` ≤ 1 and role `status='filled'`.

## 3. Duplicate retry / idempotency

- Re-POST project create with same `idempotency_key` → single row (unique).
- Re-call `accept_collaboration_request` on accepted request → returns same
  membership id, no duplicate membership/conversation (unique
  `(project_id,user_id)` + conversation reuse).
- Re-send message with same `idempotency_key` → single row.

## 4. Pair uniqueness across states

- A→B request `withdrawn`, then B→A new intro must still fail on
  `collaboration_requests_pair_uidx` (index covers all statuses).
- Verify `INSERT` of reversed pair raises unique violation.
