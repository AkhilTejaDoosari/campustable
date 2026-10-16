-- 0004: projects, contact relationship, conversations/messages, moderation, outcomes.
-- Structural foundation for slices 3-5; enforced transactionally in app code.

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  university_id uuid references universities(id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  problem text not null default '',
  audience text not null default '',
  goal text not null default '',
  deliverable text not null default '',
  success_criteria text not null default '',
  scope_exclusions text not null default '',
  duration text not null default '',
  weekly_commitment text not null default '',
  meeting_format text not null default '',
  eligibility text not null default 'all' check (eligibility in ('all','university_only')),
  status text not null default 'draft' check (status in ('draft','open','closed')),
  revision int not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on projects (owner_id);
create index projects_status_idx on projects (status);

create table project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  responsibility text not null default '',
  commitment text not null default '',
  capacity int not null check (capacity > 0 and capacity <= 50),
  created_at timestamptz not null default now()
);
create index project_roles_project_idx on project_roles (project_id);

create table project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role_id uuid not null references project_roles(id) on delete cascade,
  applicant_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','withdrawn','expired','closed')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (role_id, applicant_id, status)
);
create index applications_project_idx on project_applications (project_id);
create unique index applications_one_active_per_role
  on project_applications (role_id, applicant_id)
  where status = 'pending';

create table project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid references project_roles(id) on delete set null,
  status text not null default 'active' check (status in ('active','left','removed')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (project_id, user_id, status)
);
create unique index memberships_one_active_per_project
  on project_memberships (project_id, user_id) where status = 'active';

-- One durable unordered pair per account pair (canonical low/high ids).
create table contact_relationships (
  id uuid primary key default gen_random_uuid(),
  low_user_id uuid not null references users(id) on delete cascade,
  high_user_id uuid not null references users(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  state text not null default 'pending'
    check (state in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  check (low_user_id < high_user_id),
  check (sender_id in (low_user_id, high_user_id) or true),
  unique (low_user_id, high_user_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references contact_relationships(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (author_id, idempotency_key)
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table blocks (
  actor_id uuid not null references users(id) on delete cascade,
  target_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  check (actor_id <> target_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_id uuid not null references users(id) on delete cascade,
  context text not null default '',
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open'
    check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_outcome boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table project_roles enable row level security;
alter table project_applications enable row level security;
alter table project_memberships enable row level security;
alter table contact_relationships enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table project_updates enable row level security;
-- Deny-by-default (see 0001).
