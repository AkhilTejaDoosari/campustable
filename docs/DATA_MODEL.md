# Initial logical data model — Phase 0B

Status: logical design only. No migrations, finalized column names, complete indexes or permission policies yet. Phase 0C must specify those before code.

| Record group                          | Essential keys/links and data                                                                             | Required constraints / privacy                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Auth accounts                         | Provider user ID, verified personal identity/session                                                      | Supabase Auth source of truth; no copied plaintext credentials                                    |
| profiles / setup drafts               | account ID, names/about/links, selected role/university, completion, visibility, revision, policy consent | One profile/account; owner edits; separate public projection from private setup fields            |
| universities / university_domains     | university ID, name/website, normalized exact domain, review status                                       | Reviewed mappings; avoid wildcard suffix guesses and fraudulent submitted websites                |
| affiliations                          | account/university IDs, role, academic/department fields, mailbox-control status, review status           | Distinct mailbox proof and role approval; historical affiliation not overwritten by a role switch |
| email_claims / challenges             | account ID, normalized private mailbox, purpose, challenge expiry/attempts/consumed status                | Unique active mailbox ownership; atomic claim; secrets/proofs absent from public reads            |
| institution_requests / role_reviews   | requester, supplied institution/role info, authorized reviewer/disposition                                | Pending does not grant authority; reviewer-only decision; private evidence                        |
| topics / profile_topics               | normalized topic ID, display label, profile ID, intent                                                    | Duplicate relation prevention; Unicode/bounds rules finalized in 0C                               |
| participation_preferences             | profile ID, meeting/timezone/availability/optional scheduling                                             | Self-reported; private disclosure rules; no actual calendar tokens                                |
| file_records / private object storage | file ID, owner, object path, MIME/size, sharing and lifecycle                                             | Bucket/object permission, metadata validation, upload quota; no arbitrary shared evidence access  |
| projects                              | project ID, owner/university, brief fields, boundary, status, revision                                    | Owner authorization; publication completeness; draft private                                      |
| project_roles                         | role/project IDs, responsibility/commitment, capacity                                                     | Positive bounded capacity; active membership count canonical, not pending application count       |
| project_applications / invitations    | project/role/person, creator, status, original operation key                                              | At most one active application for person/role; invitations require participant consent           |
| project_memberships                   | project/person/role, responsibility snapshot, status, joined/left                                         | Unique active project/person; capacity and consent enforced transactionally                       |
| contact_relationships                 | canonical low/high account IDs, original sender/recipient/intro, internal state                           | Unordered pair unique; retained denial/withdrawal; state exposed via actor-specific projection    |
| conversations / messages              | contact/conversation ID, participant-author ID, content, client operation key                             | Accepted participants only; message author matches session; per-author operation key unique       |
| blocks / reports / review audit       | actor/target/context, reason, review action and timestamps                                                | Block uniqueness; owner/reviewer permissions; report identity/evidence private                    |
| project_updates / outcomes            | project/actor, progress statement, first-work report                                                      | Author permissions; factual self-report, not inferred verification                                |

## Sources of truth

Identity/session: Auth provider. Profile and affiliation state: database. Mail delivery result: selected provider plus server-owned challenge state. Files: private storage objects with database metadata. Role occupancy: active memberships. Contact allowance: durable canonical relationship. Messages: database, not browser arrays. UI drafts may cache unsent text but cannot confer persisted completion or authority.

## Required Phase 0C decisions

- Final email normalization, challenge scheme, expiry/attempt/resend/global rate limits, proof hashing/signing and replay prevention. Authentication recovery vs school-mail verification must use distinct purposes.
- Account deletion/claim reassignment, retention for consumed contact records, files/evidence/reports/messages and required audit history. No arbitrary permanent retention or new privacy promises.
- Profile/public-field projections; reviewer-approved and pending privileges; precise file-sharing rules. APIs must not let sender read internal declined state.
- Physical schema, foreign-key delete behavior, unique partial indexes, query indexes, pagination and operation-key scope/retention.
- Transactions/locks/isolation for capacity, contact approval, membership removal, project closure and block races; ownership departure/transfer.
- RLS plus grants for each table; definer-rights function hardening if used; direct REST/RPC bypass negative tests.
- Permissioned role reviewers and bootstrap; storage file types/size and scan/delivery policy; retention job ownership.
- Backups and actual restore method for database AND file objects, environment separation, costs and limits.

Do not turn these logical groups into thirty tables by default. Merge records when ownership/lifecycle align; split where privacy or enforcement needs a boundary. Every physical table/index must have a documented purpose.
