-- =============================================================================
-- Migration 5: Visibility-aware counts in event_summary
-- =============================================================================
--
-- PROBLEM: event_summary() runs as SECURITY DEFINER, so its subquery counts
-- bypass RLS and always return global totals. A limited participant sees
-- "Schedule: 2" but clicks through and sees nothing.
--
-- FIX: Make each count conditional on the caller's access level, mirroring
-- the RLS policies from migration 00004.
-- =============================================================================

CREATE OR REPLACE FUNCTION event_summary(p_event_id uuid)
RETURNS TABLE (
  event_id uuid,
  event_name text,
  event_status event_status,
  start_date date,
  end_date date,
  description text,
  owner_account_id uuid,
  owner_account_name text,
  participant_count bigint,
  service_count bigint,
  schedule_item_count bigint,
  document_count bigint,
  contact_count bigint,
  location_count bigint,
  can_edit boolean,
  can_manage_participants boolean,
  can_manage_services boolean,
  can_manage_schedule_items boolean,
  can_manage_docs boolean,
  can_confirm_vendors boolean,
  is_owner boolean,
  participant_visibility_level text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_staff boolean;
  v_is_owner boolean;
  v_vis text;
BEGIN
  -- Check basic access first
  IF NOT public.can_view_event(p_event_id) THEN
    RETURN;
  END IF;

  v_is_staff := public.is_staff();
  v_is_owner := public.is_event_owner_member(p_event_id);
  v_vis := public.get_participant_visibility(p_event_id);

  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.status,
    e.start_date,
    e.end_date,
    e.description,
    e.owner_account_id,
    a.name,

    -- Participant count: always visible
    (SELECT count(*) FROM public.event_accounts WHERE event_accounts.event_id = e.id),

    -- Service count: staff/owner see all, standard sees all, limited sees own-account only
    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_services WHERE event_services.event_id = e.id)
      WHEN v_vis = 'standard' THEN
        (SELECT count(*) FROM public.event_services WHERE event_services.event_id = e.id)
      WHEN v_vis = 'limited' THEN
        (SELECT count(*) FROM public.event_services es
         WHERE es.event_id = e.id
           AND es.account_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM public.account_memberships am
             WHERE am.account_id = es.account_id AND am.profile_id = auth.uid()
           ))
      ELSE 0::bigint
    END,

    -- Schedule count: staff/owner/standard see all, limited sees 0
    CASE
      WHEN v_is_staff OR v_is_owner OR v_vis = 'standard' THEN
        (SELECT count(*) FROM public.event_schedule_items WHERE event_schedule_items.event_id = e.id)
      ELSE 0::bigint
    END,

    -- Document count: staff/owner see all, participants see only all_participants
    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_documents WHERE event_documents.event_id = e.id)
      ELSE
        (SELECT count(*) FROM public.event_documents
         WHERE event_documents.event_id = e.id AND event_documents.visibility = 'all_participants')
    END,

    -- Contact count: staff/owner see all, participants see only all_participants
    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_contact_roles WHERE event_contact_roles.event_id = e.id)
      ELSE
        (SELECT count(*) FROM public.event_contact_roles
         WHERE event_contact_roles.event_id = e.id AND event_contact_roles.visibility = 'all_participants')
    END,

    -- Location count: staff/owner/standard see all, limited sees 0
    CASE
      WHEN v_is_staff OR v_is_owner OR v_vis = 'standard' THEN
        (SELECT count(*) FROM public.event_locations WHERE event_locations.event_id = e.id)
      ELSE 0::bigint
    END,

    public.can_edit_event(e.id),
    public.can_manage_event_participants(e.id),
    public.can_manage_services(e.id),
    public.can_manage_schedule(e.id),
    public.can_manage_documents(e.id),
    public.can_confirm_vendor(e.id),
    v_is_owner,
    v_vis
  FROM public.events e
  JOIN public.accounts a ON a.id = e.owner_account_id
  WHERE e.id = p_event_id;
END;
$$;
