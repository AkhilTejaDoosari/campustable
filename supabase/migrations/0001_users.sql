-- 0001: application users (Clerk-linked). Supabase Auth is NOT used.
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  primary_email citext not null,
  role text not null default 'student' check (role in ('student','alumni','faculty','admin')),
  onboarding_state text not null default 'started'
    check (onboarding_state in ('started','affiliation','profile','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_primary_email_idx on users (primary_email);
create index users_role_idx on users (role);

alter table users enable row level security;
-- Deny-by-default: no anon/authenticated policies. All access goes through
-- server-side handlers (service-role) that enforce Clerk session + CampusTable
-- authorization. Policies are added per-table in later slices as direct
-- client access is justified. This prevents accidental public reads.
