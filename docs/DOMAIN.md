# Domain model and invariants — Phase 0B

Status: domain draft. Enforcement design and exact access grants finalized in Phase 0C.

## Entities and ownership

Account: authenticated identity owned by Supabase Auth; not an editable profile badge.
Profile: account-owned public/community-facing data plus disclosure policy and setup progress.
University: curated identity with reviewed domain mappings; not a separate database tenant.
Affiliation: account-to-university relationship, selected role, academic/department fields, proof/review status. Historical affiliations are separate from current claims.
Email claim/challenge: private secondary-mail association and proof lifecycle; private mailbox control separate from role review.
Topic/profile topic: normalized search identity with original display label and offered/wanted type.
File record: owner, private object location, type/size, retention/share status; object possession never grants permission.
Project: creator-owned brief, university boundary and lifecycle. Project role: responsibilities, commitment and bounded capacity.
Application/invitation: proposed project-role contribution, applicant/invitee, consent and disposition.
Membership: project/account contribution and lifecycle; creator starts as owner member.
Contact relationship: one durable unordered pair, original introduction and actor-specific state projection.
Conversation/message: accepted pair conversation and participant-authored persisted messages.
Block/report/review/audit/outcome: privacy and trust records with explicit actor permissions.

## Cardinality

- One account → one active profile; one account → many historical/current affiliations, but only one selected primary university in V1 UI.
- One university → many exact approved domains; one domain mapping has one active university owner unless ambiguity is explicitly reviewed.
- One normalized school email → at most one active account claim; account → multiple historical challenges, none visible to others.
- Profile ↔ topics: many-to-many, differentiated by offered/wanted intent.
- Project → many roles/applications/memberships/updates. Account → many projects and memberships.
- Unordered account pair → at most one contact relationship and one active conversation. Conversation → many messages.
- Application links one person, project and role; an invitation identifies sender and intended participant; no implicit consent.

## Lifecycles

Account/session follows the provider; deletion/suspension has application consequences defined in 0C.
Setup: draft → complete; loss of required eligibility → restricted. A saved draft does not imply verification.
Mailbox proof: requested → verified / expired / exhausted / delivery-failed / superseded. Verified proof cannot be consumed twice; issuing a later proof supersedes older usable proof under explicit rules.
Domain review: pending → approved / rejected. Mailbox verified does not shortcut domain review.
Affiliation role: self-reported / review-pending / approved / rejected; mailbox-control status is orthogonal. Student badge says mailbox verified, not enrollment verified. Alumni self-report is legitimate V1 status.
Project: draft → open → closed; filled is derived from roles, not a conflicting second truth. A closed project cannot accept new members. Reopen/ownership transfer are not implicit operations; define before adding.
Application/invitation: pending → accepted / declined / withdrawn / expired / closed. Terminal-state retry is idempotent only for its own original successful action. Do not resurrect declined applications via another endpoint.
Membership: active → left / removed. Role capacity counts active role memberships, not pending requests.
Contact: pending → accepted / declined / withdrawn. Declined/withdrawn remain durable so intro allowance stays consumed. Sender decline projection is neutral pending. Already accepted contact is reused for another project, not reintroduced.
Message: server-owned committed record; client pending/failed is delivery UI state, never authoritative database membership.
Report: open → reviewing → resolved / dismissed; reviewer action is audited.

## Invariants and enforcement ownership

1. Proof verifies the correct account, mailbox and purpose. Server-controlled proof consumption with challenge/account binding; never profile form input.
2. One active school-email owner: unique database constraint plus atomic claim/proof-consumption operation. Normalization policy must not rewrite dot/plus aliases without provider-specific justification.
3. Object owner/participant checks: authenticated server operation and RLS/grants. Browser route hiding is insufficient.
4. No more than one introduction per unordered pair: canonical pair keys, durable uniqueness and transaction; withdrawal/block/unblock do not delete the consumed record.
5. Silent decline: actor-specific response/query projection, including realtime/events/errors. Do not expose the raw contact table's hidden state directly to the sender.
6. Last role slot: serialize acceptance for that role and atomically create/update application, contact/conversation if required and active membership. No partial success.
7. No duplicate active membership/application: unique keys and idempotent mutations. Same accepted person can hold a documented responsibility; do not silently assign duplicate roles/capacity.
8. Block: read/contact/message and acceptance operations all recheck effective block; concurrency policy must be specified at 0C.
9. Private files/evidence: private bucket, authorized access; no public URL as a substitute for permission.
10. Complete-brief publication: server validation; reject direct calls for incomplete drafts. A frontend wizard is not the enforcement point.
11. Role changes and mailbox re-verification cannot self-grant reviewer approval. Date checks only enforce consistency.
12. Academic/collaboration outcome remains self-reported; creator cannot forge another member's statement.

## Tenancy and boundaries

V1 has one shared university community database. University selection is a search preference; project university-only eligibility is a server-enforced application rule. Neither replaces object authorization. Private evidence remains owner/reviewer-only regardless of university.
