-- CampusTable V1 — 0002_rls
-- Row Level Security: enable on ALL tables + policies per table.
-- Conventions: anon = anon role; authenticated users act only via auth.uid().
-- Writes denied anonymously (no anon INSERT/UPDATE/DELETE policies except none).
-- Private tables are owner/member-scoped. No privileged server keys used anywhere.

-- Enable RLS on every table --------------------------------------------------
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_domains    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliation_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_notes         ENABLE ROW LEVEL SECURITY;

-- profiles: public-directory read is visibility-scoped -----------------------
-- Authenticated users read own row + rows with visibility='all'.
-- university_only rows readable only by verified members of a shared university
-- (approximated here: reader holds ANY verified affiliation and target row is
-- university_only; precise per-university scoping enforced in app queries via
-- is_verified_member). Anonymous users read nothing private.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT TO authenticated USING (visibility = 'all');
DROP POLICY IF EXISTS profiles_select_university ON public.profiles;
CREATE POLICY profiles_select_university ON public.profiles
  FOR SELECT TO authenticated USING (
    visibility = 'university_only'
    AND EXISTS (SELECT 1 FROM public.affiliations a
                WHERE a.user_id = auth.uid() AND a.status = 'verified')
  );
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- universities: world-readable ------------------------------------------------
DROP POLICY IF EXISTS universities_select_all ON public.universities;
CREATE POLICY universities_select_all ON public.universities
  FOR SELECT TO anon, authenticated USING (true);

-- university_domains: approved rows world-readable; rest ownerless (admin) -----
DROP POLICY IF EXISTS university_domains_select_approved ON public.university_domains;
CREATE POLICY university_domains_select_approved ON public.university_domains
  FOR SELECT TO anon, authenticated USING (status = 'approved');

-- affiliations: strictly owner-scoped ------------------------------------------
DROP POLICY IF EXISTS affiliations_select_own ON public.affiliations;
CREATE POLICY affiliations_select_own ON public.affiliations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS affiliations_insert_own ON public.affiliations;
CREATE POLICY affiliations_insert_own ON public.affiliations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS affiliations_update_own ON public.affiliations;
CREATE POLICY affiliations_update_own ON public.affiliations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- No DELETE policy: withdrawal handled server-side via function/status change.

-- affiliation_challenges: strictly owner-scoped -----------------------------------
DROP POLICY IF EXISTS challenges_select_own ON public.affiliation_challenges;
CREATE POLICY challenges_select_own ON public.affiliation_challenges
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS challenges_insert_own ON public.affiliation_challenges;
CREATE POLICY challenges_insert_own ON public.affiliation_challenges
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS challenges_update_own ON public.affiliation_challenges;
CREATE POLICY challenges_update_own ON public.affiliation_challenges
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- projects -----------------------------------------------------------------------
-- anon: open + visibility='all' only. authenticated: + university_only when
-- reader is a verified member of the project's university, or is the owner.
DROP POLICY IF EXISTS projects_select_anon_open ON public.projects;
CREATE POLICY projects_select_anon_open ON public.projects
  FOR SELECT TO anon USING (stage = 'open' AND visibility = 'all');
DROP POLICY IF EXISTS projects_select_auth_open ON public.projects;
CREATE POLICY projects_select_auth_open ON public.projects
  FOR SELECT TO authenticated USING (
    stage = 'open' AND (
      visibility = 'all'
      OR (visibility = 'university_only' AND university_id IS NOT NULL
          AND public.is_verified_member(university_id))
      OR owner_id = auth.uid()
    )
  );
-- Owners read their own non-open drafts etc.
DROP POLICY IF EXISTS projects_select_owner ON public.projects;
CREATE POLICY projects_select_owner ON public.projects
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
-- Members read projects they belong to (any stage except hidden internals).
DROP POLICY IF EXISTS projects_select_member ON public.projects;
CREATE POLICY projects_select_member ON public.projects
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.project_memberships m
            WHERE m.project_id = projects.id AND m.user_id = auth.uid()
              AND m.status = 'active')
  );
DROP POLICY IF EXISTS projects_insert_owner ON public.projects;
CREATE POLICY projects_insert_owner ON public.projects
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS projects_update_owner ON public.projects;
CREATE POLICY projects_update_owner ON public.projects
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS projects_delete_owner ON public.projects;
CREATE POLICY projects_delete_owner ON public.projects
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- project_roles ----------------------------------------------------------------------
-- Read mirrors parent project visibility: open roles of visible projects.
DROP POLICY IF EXISTS project_roles_select_anon ON public.project_roles;
CREATE POLICY project_roles_select_anon ON public.project_roles
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id
              AND p.stage = 'open' AND p.visibility = 'all')
  );
DROP POLICY IF EXISTS project_roles_select_auth ON public.project_roles;
CREATE POLICY project_roles_select_auth ON public.project_roles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id
              AND (p.owner_id = auth.uid()
                   OR (p.stage = 'open' AND p.visibility = 'all')
                   OR (p.stage = 'open' AND p.visibility = 'university_only'
                       AND p.university_id IS NOT NULL
                       AND public.is_verified_member(p.university_id))
                   OR EXISTS (SELECT 1 FROM public.project_memberships m
                              WHERE m.project_id = p.id AND m.user_id = auth.uid()
                                AND m.status = 'active')))
  );
-- Writes: project owner only.
DROP POLICY IF EXISTS project_roles_owner_write ON public.project_roles;
CREATE POLICY project_roles_owner_write ON public.project_roles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id AND p.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id AND p.owner_id = auth.uid())
  );

-- collaboration_requests: participant-scoped (from_user or to_user) --------------------
DROP POLICY IF EXISTS collab_req_select_participant ON public.collaboration_requests;
CREATE POLICY collab_req_select_participant ON public.collaboration_requests
  FOR SELECT TO authenticated USING (
    from_user = auth.uid() OR to_user = auth.uid()
  );
DROP POLICY IF EXISTS collab_req_insert_sender ON public.collaboration_requests;
CREATE POLICY collab_req_insert_sender ON public.collaboration_requests
  FOR INSERT TO authenticated WITH CHECK (from_user = auth.uid());
DROP POLICY IF EXISTS collab_req_update_participant ON public.collaboration_requests;
CREATE POLICY collab_req_update_participant ON public.collaboration_requests
  FOR UPDATE TO authenticated USING (
    from_user = auth.uid() OR to_user = auth.uid()
  ) WITH CHECK (
    from_user = auth.uid() OR to_user = auth.uid()
  );
-- No DELETE: use status=withdrawn.

-- project_memberships: member of project or owner ---------------------------------------
DROP POLICY IF EXISTS memberships_select_scoped ON public.project_memberships;
CREATE POLICY memberships_select_scoped ON public.project_memberships
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p
               WHERE p.id = project_memberships.project_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_memberships m2
               WHERE m2.project_id = project_memberships.project_id
                 AND m2.user_id = auth.uid() AND m2.status = 'active')
  );
-- Direct writes denied: membership changes go through SECURITY DEFINER function.
-- (No INSERT/UPDATE/DELETE policies for authenticated → default deny.)

-- conversations / members / messages: conversation-member-scoped --------------------------
DROP POLICY IF EXISTS conversations_select_member ON public.conversations;
CREATE POLICY conversations_select_member ON public.conversations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid())
  );
-- Conversation creation via function only (no direct INSERT policy → deny).

DROP POLICY IF EXISTS conversation_members_select_member ON public.conversation_members;
CREATE POLICY conversation_members_select_member ON public.conversation_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.conversation_members cm
               WHERE cm.conversation_id = conversation_members.conversation_id
                 AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS messages_select_member ON public.messages;
CREATE POLICY messages_select_member ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
  );
DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_insert_member ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.conversation_members cm
                WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
  );

-- blocks: blocker-scoped ---------------------------------------------------------
DROP POLICY IF EXISTS blocks_select_blocker ON public.blocks;
CREATE POLICY blocks_select_blocker ON public.blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS blocks_insert_blocker ON public.blocks;
CREATE POLICY blocks_insert_blocker ON public.blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
DROP POLICY IF EXISTS blocks_delete_blocker ON public.blocks;
CREATE POLICY blocks_delete_blocker ON public.blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- reports: reporter-scoped ---------------------------------------------------------
DROP POLICY IF EXISTS reports_insert_reporter ON public.reports;
CREATE POLICY reports_insert_reporter ON public.reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS reports_select_reporter ON public.reports;
CREATE POLICY reports_select_reporter ON public.reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- outcome_notes: project members + author --------------------------------------------
DROP POLICY IF EXISTS outcome_notes_select_scoped ON public.outcome_notes;
CREATE POLICY outcome_notes_select_scoped ON public.outcome_notes
  FOR SELECT TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.project_memberships m
               WHERE m.project_id = outcome_notes.project_id
                 AND m.user_id = auth.uid() AND m.status = 'active')
    OR EXISTS (SELECT 1 FROM public.projects p
               WHERE p.id = outcome_notes.project_id AND p.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS outcome_notes_insert_member ON public.outcome_notes;
CREATE POLICY outcome_notes_insert_member ON public.outcome_notes
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND (EXISTS (SELECT 1 FROM public.project_memberships m
                 WHERE m.project_id = outcome_notes.project_id
                   AND m.user_id = auth.uid() AND m.status = 'active')
         OR EXISTS (SELECT 1 FROM public.projects p
                    WHERE p.id = outcome_notes.project_id AND p.owner_id = auth.uid()))
  );
