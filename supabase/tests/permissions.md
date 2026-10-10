# Permission matrix — SQL review status (NOT live-tested)

> Status: SQL-review + procedure pending live run. These policies have NOT been
> executed against a live Supabase instance. Do not claim otherwise.

## Matrix

| Resource | Anonymous | Authenticated non-member | Owner / participant / member |
|---|---|---|---|
| profiles | deny | `all` rows only; `university_only` only with any verified affiliation | own row full read/update |
| universities | read all | read all | read all (no direct write) |
| university_domains | read `approved` only | read `approved` only | read `approved` only |
| affiliations | deny | deny (others' rows) | own rows CRUD (no delete; status via workflow) |
| affiliation_challenges | deny | deny (others' rows) | own rows read/insert/update |
| projects | read `open` + `all` | `open`+`all`; `university_only` only via `is_verified_member(univ)` or membership | owner full CRUD; members read |
| project_roles | read when parent visible (anon rule) | read when parent visible | owner write; members/visible read |
| collaboration_requests | deny | deny unless participant | `from_user`/`to_user` read; sender inserts; participants update (accept path via function) |
| project_memberships | deny | deny | member/owner/member-of-project read; writes via function only |
| conversations | deny | deny | conversation-member read; creation via function only |
| conversation_members | deny | deny | member-scoped read; writes via function only |
| messages | deny | deny | member read; member insert with `sender_id = auth.uid()` |
| blocks | deny | deny | blocker read/insert/delete own |
| reports | deny | deny | reporter insert + read own |
| outcome_notes | deny | deny | author/member/owner read; member-owner insert |

## How to run (pending live Supabase)

1. Start local Supabase (`supabase start`) or use a scratch cloud project.
2. Apply: `supabase db reset` (applies `supabase/migrations` in order).
3. Create three test users (owner, applicant, stranger) + anon client.
4. For each matrix row: attempt read/write as each actor; assert allow/deny.
5. Record results in this file's appendix before claiming coverage.
