-- =============================================================================
-- Migration 6: Enhanced dashboard with richer event cards
-- =============================================================================
--
-- Adds: primary location, next schedule item, role label to dashboard results.
-- Makes dashboard data rich enough for meaningful cards without N+1 queries.
-- =============================================================================

-- Must drop first: adds new return columns and changes language from sql to plpgsql
DROP FUNCTION IF EXISTS my_events_dashboard();
CREATE OR REPLACE FUNCTION my_events_dashboard()
RETURNS TABLE (
  event_id uuid,
  event_name text,
  event_status event_status,
  start_date date,
  end_date date,
  owner_account_id uuid,
  owner_account_name text,
  user_role text,
  is_owner_account boolean,
  primary_location_name text,
  next_schedule_title text,
  next_schedule_time timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  v_is_staff := public.is_staff();

  RETURN QUERY
  -- Events through owner accounts
  SELECT
    e.id,
    e.name,
    e.status,
    e.start_date,
    e.end_date,
    e.owner_account_id,
    a.name,
    am.account_role::text,
    true,
    (SELECT el.name FROM public.event_locations el WHERE el.event_id = e.id ORDER BY el.created_at LIMIT 1),
    (SELECT esi.title FROM public.event_schedule_items esi
     WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
     ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1),
    (SELECT esi.start_time FROM public.event_schedule_items esi
     WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
     ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1),
    e.updated_at
  FROM public.events e
  JOIN public.accounts a ON a.id = e.owner_account_id
  JOIN public.account_memberships am
    ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
  WHERE public.membership_has_permission(am.id, 'event.view_owned')

  UNION ALL

  -- Events through participant accounts
  SELECT
    e.id,
    e.name,
    e.status,
    e.start_date,
    e.end_date,
    e.owner_account_id,
    a.name,
    am.account_role::text,
    false,
    -- Limited participants can't see locations, so return null for them
    CASE
      WHEN v_is_staff OR ea.visibility = 'standard' THEN
        (SELECT el.name FROM public.event_locations el WHERE el.event_id = e.id ORDER BY el.created_at LIMIT 1)
      ELSE NULL
    END,
    -- Limited participants can't see schedule, so return null for them
    CASE
      WHEN v_is_staff OR ea.visibility = 'standard' THEN
        (SELECT esi.title FROM public.event_schedule_items esi
         WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
         ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1)
      ELSE NULL
    END,
    CASE
      WHEN v_is_staff OR ea.visibility = 'standard' THEN
        (SELECT esi.start_time FROM public.event_schedule_items esi
         WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
         ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1)
      ELSE NULL
    END,
    e.updated_at
  FROM public.events e
  JOIN public.event_accounts ea ON ea.event_id = e.id
  JOIN public.accounts a ON a.id = e.owner_account_id
  JOIN public.account_memberships am
    ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
  WHERE public.membership_has_permission(am.id, 'event.view_participant');
END;
$$;

-- Also update event_summary to return updated_at and timezone
-- Must drop first: adds new return columns (timezone, can_manage_contacts, event_updated_at)
DROP FUNCTION IF EXISTS event_summary(uuid);
CREATE OR REPLACE FUNCTION event_summary(p_event_id uuid)
RETURNS TABLE (
  event_id uuid,
  event_name text,
  event_status event_status,
  start_date date,
  end_date date,
  description text,
  timezone text,
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
  can_manage_contacts boolean,
  can_confirm_vendors boolean,
  is_owner boolean,
  participant_visibility_level text,
  event_updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_staff boolean;
  v_is_owner boolean;
  v_vis text;
BEGIN
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
    e.timezone,
    e.owner_account_id,
    a.name,

    (SELECT count(*) FROM public.event_accounts WHERE event_accounts.event_id = e.id),

    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_services WHERE event_services.event_id = e.id)
      WHEN v_vis = 'standard' THEN
        (SELECT count(*) FROM public.event_services WHERE event_services.event_id = e.id)
      WHEN v_vis = 'limited' THEN
        (SELECT count(*) FROM public.event_services es
         WHERE es.event_id = e.id AND es.account_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM public.account_memberships am WHERE am.account_id = es.account_id AND am.profile_id = auth.uid()))
      ELSE 0::bigint
    END,

    CASE
      WHEN v_is_staff OR v_is_owner OR v_vis = 'standard' THEN
        (SELECT count(*) FROM public.event_schedule_items WHERE event_schedule_items.event_id = e.id)
      ELSE 0::bigint
    END,

    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_documents WHERE event_documents.event_id = e.id)
      ELSE
        (SELECT count(*) FROM public.event_documents WHERE event_documents.event_id = e.id AND event_documents.visibility = 'all_participants')
    END,

    CASE
      WHEN v_is_staff OR v_is_owner THEN
        (SELECT count(*) FROM public.event_contact_roles WHERE event_contact_roles.event_id = e.id)
      ELSE
        (SELECT count(*) FROM public.event_contact_roles WHERE event_contact_roles.event_id = e.id AND event_contact_roles.visibility = 'all_participants')
    END,

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
    public.can_manage_event_contacts(e.id),
    public.can_confirm_vendor(e.id),
    v_is_owner,
    v_vis,
    e.updated_at
  FROM public.events e
  JOIN public.accounts a ON a.id = e.owner_account_id
  WHERE e.id = p_event_id;
END;
$$;
