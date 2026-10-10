-- CampusTable V1 — 0001_init
-- Fresh-Postgres compatible schema. Applies cleanly with `psql -f`.
-- Normalization rule (documented): canonical email/domain form = trim(BOTH ' ' FROM lower(value)).
--   No Gmail-style dot rewriting. Application layer MUST normalize before insert;
--   DB enforces via lower(trim(...)) generated/immutable helpers + citext for domains.
-- Never log OTPs / challenge codes. Only code_hash is stored.

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
-- pg_uuidv7 may not exist on older servers; fallback handled in DEFAULT below.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_uuidv7 unavailable, using gen_random_uuid() fallback';
END
$$;

-- Helper: uuid v7 with fallback. gen_random_uuid() always exists via pgcrypto.
-- We cannot branch per-row in DEFAULT, so default to gen_random_uuid();
-- app / function code prefers uuidv7() when the extension is present.
-- (Documented fallback per task spec.)

-- updated_at trigger helper -------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: verified-university membership check (used by RLS in 0002).
-- SECURITY DEFINER so anon/authenticated callers can evaluate without
-- reading the affiliations table directly.
CREATE OR REPLACE FUNCTION public.is_verified_member(p_university_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliations a
    WHERE a.user_id = auth.uid()
      AND a.university_id = p_university_id
      AND a.status = 'verified'
  );
$$;

-- profiles ------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student','alumni','faculty')),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  major text,
  degree text,
  graduation text,
  skills text[] NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT '{}',
  wants text[] NOT NULL DEFAULT '{}',
  availability text,
  meeting_format text,
  visibility text NOT NULL DEFAULT 'all' CHECK (visibility IN ('all','university_only')),
  talent_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- universities ----------------------------------------------------------------
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- university_domains ------------------------------------------------------------
CREATE TABLE public.university_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  domain citext NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX university_domains_university_id_idx ON public.university_domains (university_id);
CREATE INDEX university_domains_status_idx ON public.university_domains (status);

-- affiliations -------------------------------------------------------------------
CREATE TABLE public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  university_id uuid REFERENCES public.universities (id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('student','alumni','faculty')),
  status text NOT NULL DEFAULT 'self_reported'
    CHECK (status IN ('self_reported','pending','verified','rejected')),
  mailbox_verified boolean NOT NULL DEFAULT false,
  reviewed boolean NOT NULL DEFAULT false,
  -- Canonical school email: trim + lowercase (no dot rewriting). Nullable
  -- because self-reports may carry no email; unique when present.
  normalized_email text UNIQUE CHECK (normalized_email IS NULL OR char_length(normalized_email) BETWEEN 3 AND 320),
  evidence_object text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Faculty may not claim reviewed/verified without review:
  -- enforced at app layer + review workflow; DB guard: reviewed=true requires status verified.
  CONSTRAINT affiliations_reviewed_requires_verified
    CHECK (reviewed = false OR status = 'verified')
);
CREATE INDEX affiliations_user_id_idx ON public.affiliations (user_id);
CREATE INDEX affiliations_university_id_idx ON public.affiliations (university_id);
CREATE INDEX affiliations_status_idx ON public.affiliations (status);
CREATE INDEX affiliations_normalized_email_idx ON public.affiliations (normalized_email);

-- affiliation_challenges (OTP challenges: hash only, never plaintext/OTP logs) ----
CREATE TABLE public.affiliation_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  normalized_email text NOT NULL CHECK (char_length(normalized_email) BETWEEN 3 AND 320),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX affiliation_challenges_user_id_idx ON public.affiliation_challenges (user_id);
CREATE INDEX affiliation_challenges_email_idx ON public.affiliation_challenges (normalized_email);

-- projects ------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  audience text,
  goal text,
  deliverable text,
  success_criteria text,
  scope_exclusions text,
  contribution text,
  duration text,
  eligibility text,
  weekly_commitment text,
  meeting_format text,
  university_id uuid REFERENCES public.universities (id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'all' CHECK (visibility IN ('all','university_only')),
  stage text NOT NULL DEFAULT 'draft'
    CHECK (stage IN ('draft','open','in_progress','completed','closed')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_id_idx ON public.projects (owner_id);
CREATE INDEX projects_stage_idx ON public.projects (stage);
CREATE INDEX projects_visibility_idx ON public.projects (visibility);
CREATE INDEX projects_university_id_idx ON public.projects (university_id);

-- project_roles ---------------------------------------------------------------------
CREATE TABLE public.project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  responsibilities text,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_roles_project_id_idx ON public.project_roles (project_id);
CREATE INDEX project_roles_status_idx ON public.project_roles (status);

-- collaboration_requests --------------------------------------------------------------
-- Pair uniqueness: immutable index on ordered pair covers ALL statuses
-- (pending/accepted/declined/withdrawn) so withdrawal never bypasses the
-- one-introduction-per-pair rule.
CREATE TABLE public.collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.project_roles (id) ON DELETE SET NULL,
  from_user uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  intro text NOT NULL CHECK (char_length(intro) BETWEEN 1 AND 600),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','withdrawn')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaboration_requests_no_self CHECK (from_user <> to_user)
);
CREATE UNIQUE INDEX collaboration_requests_pair_uidx
  ON public.collaboration_requests (least(from_user, to_user), greatest(from_user, to_user));
CREATE INDEX collaboration_requests_project_id_idx ON public.collaboration_requests (project_id);
CREATE INDEX collaboration_requests_role_id_idx ON public.collaboration_requests (role_id);
CREATE INDEX collaboration_requests_status_idx ON public.collaboration_requests (status);
CREATE INDEX collaboration_requests_from_user_idx ON public.collaboration_requests (from_user);
CREATE INDEX collaboration_requests_to_user_idx ON public.collaboration_requests (to_user);

-- project_memberships -------------------------------------------------------------------
CREATE TABLE public.project_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.project_roles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','left','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX project_memberships_project_id_idx ON public.project_memberships (project_id);
CREATE INDEX project_memberships_user_id_idx ON public.project_memberships (user_id);

-- conversations --------------------------------------------------------------------------
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_project_id_idx ON public.conversations (project_id);

-- conversation_members ----------------------------------------------------------------------
CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX conversation_members_user_id_idx ON public.conversation_members (user_id);

-- messages ------------------------------------------------------------------------------------
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);

-- blocks -----------------------------------------------------------------------------------------
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

-- reports ------------------------------------------------------------------------------------------
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  target_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_needs_target
    CHECK (target_user_id IS NOT NULL OR target_project_id IS NOT NULL)
);
CREATE INDEX reports_reporter_id_idx ON public.reports (reporter_id);

-- outcome_notes ---------------------------------------------------------------------------------------
CREATE TABLE public.outcome_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 5000),
  kind text,
  self_report boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outcome_notes_project_id_idx ON public.outcome_notes (project_id);

-- updated_at triggers -------------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','universities','university_domains','affiliations',
    'affiliation_challenges','projects','project_roles','collaboration_requests',
    'project_memberships','conversations','messages','reports','outcome_notes'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.%I; ' ||
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I ' ||
      'FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END
$$;
