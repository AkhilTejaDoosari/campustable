-- 0003: profiles, skills, projects, experience, resumes/files, links, notifications.
-- Only tables required by DATA_MODEL/USER_FLOWS for the foundation slices.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 2000),
  primary_university_id uuid references universities(id) on delete set null,
  visibility text not null default 'community'
    check (visibility in ('private','community','public')),
  completion_state text not null default 'draft'
    check (completion_state in ('draft','complete','restricted')),
  policy_version text,
  policy_consented_at timestamptz,
  revision int not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  label text not null check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now()
);

create table student_skills (
  profile_id uuid not null references profiles(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  intent text not null check (intent in ('offered','wanted')),
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id, intent)
);
create index student_skills_skill_idx on student_skills (skill_id);

create table experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  organization text check (char_length(organization) <= 120),
  started_month date,
  ended_month date,
  description text not null default '' check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  check (started_month is null or ended_month is null or started_month <= ended_month)
);
create index experience_profile_idx on experience (profile_id);

create table profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('linkedin','github','portfolio','other')),
  url text not null check (url ~ '^https?://'),
  created_at timestamptz not null default now()
);
create index profile_links_profile_idx on profile_links (profile_id);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table organization_memberships (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Private file metadata; objects live in Supabase Storage (private buckets).
create table file_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  bucket text not null check (bucket in ('resumes','avatars','evidence')),
  object_key text not null unique,
  mime text not null,
  bytes int not null check (bytes > 0 and bytes <= 10485760),
  sharing text not null default 'private' check (sharing in ('private','team','reviewers')),
  created_at timestamptz not null default now()
);
create index file_records_owner_idx on file_records (owner_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc)
  where read_at is null;

alter table profiles enable row level security;
alter table skills enable row level security;
alter table student_skills enable row level security;
alter table experience enable row level security;
alter table profile_links enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table file_records enable row level security;
alter table notifications enable row level security;
-- Deny-by-default (see 0001).
