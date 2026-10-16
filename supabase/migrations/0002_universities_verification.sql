-- 0002: universities, domains, affiliations, verification challenges.
create table universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  review_status text not null default 'approved'
    check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table university_domains (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities(id) on delete cascade,
  domain citext not null unique,
  review_status text not null default 'approved'
    check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index university_domains_university_idx on university_domains (university_id);

-- One account may hold many affiliations over time; primary selection lives on profile.
create table university_affiliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  university_id uuid references universities(id) on delete restrict,
  role text not null check (role in ('student','alumni','faculty')),
  mailbox_status text not null default 'unverified'
    check (mailbox_status in ('unverified','pending','verified','failed')),
  review_status text not null default 'self_reported'
    check (review_status in ('self_reported','pending','approved','rejected')),
  school_email citext,
  degree_program text,
  department text,
  program_start_month date,
  expected_graduation_month date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'student' and school_email is not null)
    or (role in ('alumni','faculty'))
  ),
  check (
    program_start_month is null
    or expected_graduation_month is null
    or program_start_month <= expected_graduation_month
  )
);
create index affiliations_user_idx on university_affiliations (user_id);
create index affiliations_university_idx on university_affiliations (university_id);

-- OTP challenges: hash only, expiry, attempts, single-use.
create table verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  school_email citext not null,
  purpose text not null default 'university_verification'
    check (purpose in ('university_verification')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index challenges_user_email_idx on verification_challenges (user_id, school_email);
create index challenges_active_idx on verification_challenges (user_id, school_email)
  where consumed_at is null;

-- At most one ACTIVE claim per school mailbox (partial unique index).
-- Historical/consumed rows remain for audit; active = consumed_at IS NULL + verified affiliation.
create table email_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  school_email citext not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_email)
);
create index email_claims_user_idx on email_claims (user_id);

alter table universities enable row level security;
alter table university_domains enable row level security;
alter table university_affiliations enable row level security;
alter table verification_challenges enable row level security;
alter table email_claims enable row level security;
-- Deny-by-default (see 0001). Server handlers enforce ownership + uniqueness.

-- Atomic single-use consumption: marks challenge consumed, records claim,
-- flips affiliation to verified. Exactly-once via consumed_at guard.
create or replace function consume_verification_challenge(
  p_challenge_id uuid,
  p_user_id uuid,
  p_school_email citext
) returns void language plpgsql security definer as $$
declare
  v_rows int;
begin
  update verification_challenges
    set consumed_at = now()
    where id = p_challenge_id
      and user_id = p_user_id
      and school_email = p_school_email
      and consumed_at is null
      and expires_at > now();
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'challenge not consumable';
  end if;

  insert into email_claims (user_id, school_email)
    values (p_user_id, p_school_email)
    on conflict (school_email) do nothing;

  update university_affiliations
    set mailbox_status = 'verified',
        school_email = p_school_email,
        updated_at = now()
    where user_id = p_user_id
      and (school_email = p_school_email or school_email is null);

  -- Ensure exactly one active owner: if another user holds this mailbox, abort.
  if exists (
    select 1 from email_claims where school_email = p_school_email and user_id <> p_user_id
  ) then
    raise exception 'mailbox already claimed';
  end if;
end;
$$;
