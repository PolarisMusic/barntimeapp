-- =============================================================================
-- Migration 7: Fix dashboard dedupe, add document edit support
-- =============================================================================
--
-- Fixes: my_events_dashboard() now returns exactly one row per event per user.
-- If the user reaches an event as both owner-member and participant-member,
-- the owner row wins (is_owner_account = true, richer data).
-- =============================================================================

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
  SELECT DISTINCT ON (raw.event_id)
    raw.event_id,
    raw.event_name,
    raw.event_status,
    raw.start_date,
    raw.end_date,
    raw.owner_account_id,
    raw.owner_account_name,
    raw.user_role,
    raw.is_owner_account,
    raw.primary_location_name,
    raw.next_schedule_title,
    raw.next_schedule_time,
    raw.updated_at
  FROM (
    -- Events through owner accounts
    SELECT
      e.id AS event_id,
      e.name AS event_name,
      e.status AS event_status,
      e.start_date,
      e.end_date,
      e.owner_account_id,
      a.name AS owner_account_name,
      am.account_role::text AS user_role,
      true AS is_owner_account,
      (SELECT el.name FROM public.event_locations el WHERE el.event_id = e.id ORDER BY el.created_at LIMIT 1) AS primary_location_name,
      (SELECT esi.title FROM public.event_schedule_items esi
       WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
       ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1) AS next_schedule_title,
      (SELECT esi.start_time FROM public.event_schedule_items esi
       WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
       ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1) AS next_schedule_time,
      e.updated_at
    FROM public.events e
    JOIN public.accounts a ON a.id = e.owner_account_id
    JOIN public.account_memberships am
      ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
    WHERE public.membership_has_permission(am.id, 'event.view_owned')

    UNION ALL

    -- Events through participant accounts
    SELECT
      e.id AS event_id,
      e.name AS event_name,
      e.status AS event_status,
      e.start_date,
      e.end_date,
      e.owner_account_id,
      a.name AS owner_account_name,
      am.account_role::text AS user_role,
      false AS is_owner_account,
      CASE
        WHEN v_is_staff OR ea.visibility = 'standard' THEN
          (SELECT el.name FROM public.event_locations el WHERE el.event_id = e.id ORDER BY el.created_at LIMIT 1)
        ELSE NULL
      END AS primary_location_name,
      CASE
        WHEN v_is_staff OR ea.visibility = 'standard' THEN
          (SELECT esi.title FROM public.event_schedule_items esi
           WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
           ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1)
        ELSE NULL
      END AS next_schedule_title,
      CASE
        WHEN v_is_staff OR ea.visibility = 'standard' THEN
          (SELECT esi.start_time FROM public.event_schedule_items esi
           WHERE esi.event_id = e.id AND (esi.start_time IS NULL OR esi.start_time >= now())
           ORDER BY esi.start_time NULLS LAST, esi.sort_order LIMIT 1)
        ELSE NULL
      END AS next_schedule_time,
      e.updated_at
    FROM public.events e
    JOIN public.event_accounts ea ON ea.event_id = e.id
    JOIN public.accounts a ON a.id = e.owner_account_id
    JOIN public.account_memberships am
      ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
    WHERE public.membership_has_permission(am.id, 'event.view_participant')
  ) raw
  -- Prefer owner-account row over participant row for the same event
  ORDER BY raw.event_id, raw.is_owner_account DESC;
END;
$$;
