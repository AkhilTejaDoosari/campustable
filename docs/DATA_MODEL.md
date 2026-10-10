# Data model specification work
Plan tables: profiles, universities, university_domains, affiliations, projects, project_roles, collaboration_requests, project_memberships, conversations, conversation_members, messages, blocks, reports, outcome_notes.
Each table requires keys, FKs, constraints, indexes and RLS policy matrix before migration. Auth.users owns identity; public profile references user ID. Keep university emails and evidence outside public profile.
Unique normalized affiliation email with race-tested constraint; normalized account pair introduction constraint covering declined/withdrawn states; unique membership project/user; request acceptance idempotent transaction.
Private Storage: evidence/resumes optional, authorized signed access only. Store object metadata in DB; file bytes in Storage. Validate file type/size and access before accepting uploads; define scanning approach before exposing upload feature.
Migrations are versioned in supabase/migrations. Do not apply to cloud until credentials/environment are supplied and checks pass. Do not reuse Insurance Simplified database implicitly.
Retention/deletion policy and safe account email transfer procedure must be documented before enabling real users. Proposed initial backup recovery target: 24 hours of data, restore within 4 hours; validate feasibility.
