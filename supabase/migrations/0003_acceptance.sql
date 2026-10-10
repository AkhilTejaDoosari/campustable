-- CampusTable V1 — 0003_acceptance
-- Transactional, idempotent request acceptance.
-- Caller must be the project owner (explicit auth.uid() check).
-- Locks role row FOR UPDATE to prevent concurrent capacity oversubscription.

CREATE OR REPLACE FUNCTION public.accept_collaboration_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_req      public.collaboration_requests%ROWTYPE;
  v_proj     public.projects%ROWTYPE;
  v_role     public.project_roles%ROWTYPE;
  v_member   public.project_memberships%ROWTYPE;
  v_conv_id  uuid;
  v_count    integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  -- Lock the request row first (stable ordering: request -> role).
  SELECT * INTO v_req FROM public.collaboration_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent: already accepted → return existing membership id.
  IF v_req.status = 'accepted' THEN
    SELECT * INTO v_member FROM public.project_memberships
      WHERE project_id = v_req.project_id AND user_id = v_req.from_user;
    IF FOUND THEN
      RETURN v_member.id;
    END IF;
    -- Accepted but membership missing (should not happen): fall through to create.
  ELSIF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'request not pending (status=%)', v_req.status USING ERRCODE = 'P0001';
  END IF;

  IF v_req.project_id IS NULL THEN
    RAISE EXCEPTION 'request has no project' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_proj FROM public.projects WHERE id = v_req.project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;

  -- Explicit owner check: only the project owner may accept.
  IF v_proj.owner_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'forbidden: only project owner may accept' USING ERRCODE = '42501';
  END IF;
  -- The recipient side of the request must be the owner (no forged routing).
  IF v_req.to_user IS DISTINCT FROM v_proj.owner_id THEN
    RAISE EXCEPTION 'forbidden: request recipient is not project owner' USING ERRCODE = '42501';
  END IF;

  -- Project must be open/in_progress.
  IF v_proj.stage NOT IN ('open','in_progress') THEN
    RAISE EXCEPTION 'conflict: project stage % does not accept members', v_proj.stage
      USING ERRCODE = 'P0001';
  END IF;

  -- Blocked pair check (either direction).
  IF EXISTS (SELECT 1 FROM public.blocks b
             WHERE (b.blocker_id = v_req.from_user AND b.blocked_id = v_req.to_user)
                OR (b.blocker_id = v_req.to_user AND b.blocked_id = v_req.from_user)) THEN
    RAISE EXCEPTION 'forbidden: blocked pair' USING ERRCODE = '42501';
  END IF;

  -- Local-only eligibility: if project is university-scoped, applicant must be
  -- a verified member of that university. Convention: university_id NOT NULL
  -- (+ visibility university_only) means local-only. Null university_id = all.
  IF v_proj.university_id IS NOT NULL AND v_proj.visibility = 'university_only' THEN
    IF NOT EXISTS (SELECT 1 FROM public.affiliations a
                   WHERE a.user_id = v_req.from_user
                     AND a.university_id = v_proj.university_id
                     AND a.status = 'verified') THEN
      RAISE EXCEPTION 'forbidden: local-only eligibility violation' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Lock role row when present; enforce open + capacity.
  IF v_req.role_id IS NOT NULL THEN
    SELECT * INTO v_role FROM public.project_roles WHERE id = v_req.role_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'role not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_role.project_id IS DISTINCT FROM v_proj.id THEN
      RAISE EXCEPTION 'conflict: role does not belong to project' USING ERRCODE = 'P0001';
    END IF;
    IF v_role.status <> 'open' THEN
      RAISE EXCEPTION 'conflict: role % is not open', v_role.status USING ERRCODE = 'P0001';
    END IF;
    SELECT count(*) INTO v_count FROM public.project_memberships m
      WHERE m.role_id = v_role.id AND m.status = 'active';
    IF v_count >= v_role.capacity THEN
      RAISE EXCEPTION 'conflict: role capacity exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Idempotent membership: unique(project_id, user_id) — reuse if present.
  SELECT * INTO v_member FROM public.project_memberships
    WHERE project_id = v_proj.id AND user_id = v_req.from_user;
  IF NOT FOUND THEN
    INSERT INTO public.project_memberships (project_id, user_id, role_id, status)
      VALUES (v_proj.id, v_req.from_user, v_req.role_id, 'active')
      RETURNING * INTO v_member;
  ELSE
    -- Reactivate / attach role if previously left; never duplicate.
    UPDATE public.project_memberships
      SET status = 'active',
          role_id = COALESCE(public.project_memberships.role_id, v_req.role_id),
          updated_at = now()
      WHERE id = v_member.id
      RETURNING * INTO v_member;
    -- Re-check capacity after reactivation when role-scoped.
    IF v_req.role_id IS NOT NULL THEN
      SELECT count(*) INTO v_count FROM public.project_memberships m
        WHERE m.role_id = v_req.role_id AND m.status = 'active';
      SELECT * INTO v_role FROM public.project_roles WHERE id = v_req.role_id;
      IF v_count > v_role.capacity THEN
        RAISE EXCEPTION 'conflict: role capacity exceeded' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- Idempotent conversation: reuse an existing project conversation the
  -- applicant already belongs to; else create + add both members.
  SELECT cm.conversation_id INTO v_conv_id
    FROM public.conversation_members cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE cm.user_id = v_req.from_user
      AND c.project_id = v_proj.id
    LIMIT 1;
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (project_id) VALUES (v_proj.id)
      RETURNING id INTO v_conv_id;
  END IF;
  INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_conv_id, v_req.from_user), (v_conv_id, v_proj.owner_id)
    ON CONFLICT DO NOTHING;

  -- Mark request accepted.
  UPDATE public.collaboration_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = v_req.id;

  -- Fill role when full.
  IF v_req.role_id IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.project_memberships m
      WHERE m.role_id = v_req.role_id AND m.status = 'active';
    SELECT * INTO v_role FROM public.project_roles WHERE id = v_req.role_id;
    IF v_count >= v_role.capacity THEN
      UPDATE public.project_roles SET status = 'filled', updated_at = now()
        WHERE id = v_req.role_id;
    END IF;
  END IF;

  RETURN v_member.id;
END;
$$;

-- Restrict execution to authenticated callers (defense in depth; function
-- itself also rejects anonymous via auth.uid() NULL check).
REVOKE ALL ON FUNCTION public.accept_collaboration_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_collaboration_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.accept_collaboration_request(uuid) IS
  'Owner-only transactional acceptance: locks role FOR UPDATE, checks stage/role-open/blocked/local-only/capacity, idempotent membership+conversation, fills role when full.';
