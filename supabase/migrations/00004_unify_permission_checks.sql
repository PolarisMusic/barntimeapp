-- =============================================================================
-- Migration 4: Unify all permission checks on computed-default model
-- =============================================================================
--
-- PROBLEM: Migration 00003 changed has_account_permission() to check computed
-- role defaults OR explicit overrides. But all event-level helpers
-- (can_view_event, can_edit_event, can_manage_*, has_event_permission)
-- and the read-model RPCs (my_events_dashboard, event_summary) still
-- JOIN directly against account_membership_permissions, which now only
-- contains explicit overrides. This means users with default role
-- permissions silently lose access to events.
--
-- FIX: Create a single internal helper membership_has_permission() that
-- checks role defaults OR explicit overrides, then rewrite every
-- event helper and RPC to use it.
--
-- ALSO FIXES:
-- - event_contact_roles.visibility not enforced in RLS
-- - participant_visibility not actually used
-- - Inline RLS policies on event_services that bypass helpers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Core helper: does a specific membership have a permission?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION membership_has_permission(p_membership_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_memberships am
    WHERE am.id = p_membership_id
      AND (
        p_permission_key = ANY(public.get_default_permissions(am.account_role))
        OR EXISTS (
          SELECT 1
          FROM public.account_membership_permissions amp
          WHERE amp.membership_id = am.id
            AND amp.permission_key = p_permission_key
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Rewrite has_event_permission to use computed defaults
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_event_permission(p_event_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, p_permission_key)
    );
$$;

-- ---------------------------------------------------------------------------
-- 3. Rewrite can_view_event — owner OR participant, using computed defaults
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_view_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      -- Owner-account member with event.view_owned (role default or explicit)
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'event.view_owned')
    )
    OR EXISTS (
      -- Participant-account member with event.view_participant (role default or explicit)
      SELECT 1
      FROM public.event_accounts ea
      JOIN public.account_memberships am
        ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
      WHERE ea.event_id = p_event_id
        AND public.membership_has_permission(am.id, 'event.view_participant')
    );
$$;

-- ---------------------------------------------------------------------------
-- 4. Rewrite can_edit_event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_edit_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'event.edit_owned')
    );
$$;

-- ---------------------------------------------------------------------------
-- 5. Rewrite can_manage_event_participants
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_event_participants(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'event.link_participants')
    );
$$;

-- ---------------------------------------------------------------------------
-- 6. Rewrite can_confirm_vendor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_confirm_vendor(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'vendor.confirm')
    );
$$;

-- ---------------------------------------------------------------------------
-- 7. Rewrite can_manage_schedule
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_schedule(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'event.manage_schedule')
    );
$$;

-- ---------------------------------------------------------------------------
-- 8. Rewrite can_manage_documents
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_documents(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am
        ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      WHERE e.id = p_event_id
        AND public.membership_has_permission(am.id, 'event.manage_documents')
    );
$$;

-- ---------------------------------------------------------------------------
-- 9. can_manage_services and can_manage_event_contacts already delegate
--    to has_event_permission, so they pick up the fix automatically.
--    But re-state them for clarity.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_manage_services(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_event_permission(p_event_id, 'event.manage_services');
$$;

CREATE OR REPLACE FUNCTION can_manage_event_contacts(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_event_permission(p_event_id, 'event.manage_contacts');
$$;

-- ---------------------------------------------------------------------------
-- 10. Helper: is current user an owner-account member for this event?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_event_owner_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.account_memberships am
      ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
    WHERE e.id = p_event_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 11. Rewrite my_events_dashboard() — use computed defaults
-- ---------------------------------------------------------------------------
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
  is_owner_account boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
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
    true
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
    false
  FROM public.events e
  JOIN public.event_accounts ea ON ea.event_id = e.id
  JOIN public.accounts a ON a.id = e.owner_account_id
  JOIN public.account_memberships am
    ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
  WHERE public.membership_has_permission(am.id, 'event.view_participant')
$$;

-- ---------------------------------------------------------------------------
-- 12. Rewrite event_summary() — use computed defaults and add contact/location counts
-- ---------------------------------------------------------------------------
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    e.id,
    e.name,
    e.status,
    e.start_date,
    e.end_date,
    e.description,
    e.owner_account_id,
    a.name,
    (SELECT count(*) FROM public.event_accounts WHERE event_id = e.id),
    (SELECT count(*) FROM public.event_services WHERE event_id = e.id),
    (SELECT count(*) FROM public.event_schedule_items WHERE event_id = e.id),
    (SELECT count(*) FROM public.event_documents WHERE event_id = e.id),
    (SELECT count(*) FROM public.event_contact_roles WHERE event_id = e.id),
    (SELECT count(*) FROM public.event_locations WHERE event_id = e.id),
    public.can_edit_event(e.id),
    public.can_manage_event_participants(e.id),
    public.can_manage_services(e.id),
    public.can_manage_schedule(e.id),
    public.can_manage_documents(e.id),
    public.can_confirm_vendor(e.id),
    public.is_event_owner_member(e.id),
    public.get_participant_visibility(e.id)
  FROM public.events e
  JOIN public.accounts a ON a.id = e.owner_account_id
  WHERE e.id = p_event_id
    AND public.can_view_event(e.id);
$$;

-- ---------------------------------------------------------------------------
-- 13. Fix event_contact_roles visibility enforcement
--     - Change visibility column to use a proper enum
--     - Update RLS so participants only see all_participants contacts
-- ---------------------------------------------------------------------------

-- Create the enum for contact visibility (reuse same values as documents)
CREATE TYPE contact_visibility AS ENUM ('owner_only', 'all_participants');

-- Convert the text column to enum
ALTER TABLE event_contact_roles
  ALTER COLUMN visibility DROP DEFAULT;
ALTER TABLE event_contact_roles
  ALTER COLUMN visibility TYPE contact_visibility
    USING CASE
      WHEN visibility = 'all_participants' THEN 'all_participants'::contact_visibility
      ELSE 'owner_only'::contact_visibility
    END;
ALTER TABLE event_contact_roles
  ALTER COLUMN visibility SET DEFAULT 'owner_only';

-- Drop the old permissive select policy and replace with visibility-aware one
DROP POLICY IF EXISTS "Users can view event contact roles for events they can view"
  ON event_contact_roles;

CREATE POLICY "Users can view event contacts based on visibility"
  ON event_contact_roles FOR SELECT
  USING (
    is_staff()
    OR (
      can_view_event(event_id)
      AND (
        -- All-participants contacts visible to anyone who can view
        visibility = 'all_participants'
        -- Owner-only contacts visible only to owner-account members
        OR (
          visibility = 'owner_only'
          AND is_event_owner_member(event_id)
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 14. Fix inline RLS policies on event_services that bypassed helpers
--     These were defined in 00001 with direct JOINs to amp table
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users with manage permission can insert services" ON event_services;
DROP POLICY IF EXISTS "Users with manage permission can update services" ON event_services;
DROP POLICY IF EXISTS "Users with manage permission can delete services" ON event_services;

CREATE POLICY "Users with manage permission can insert services"
  ON event_services FOR INSERT
  WITH CHECK (can_manage_services(event_id));

CREATE POLICY "Users with manage permission can update services"
  ON event_services FOR UPDATE
  USING (can_manage_services(event_id));

CREATE POLICY "Users with manage permission can delete services"
  ON event_services FOR DELETE
  USING (can_manage_services(event_id));

-- ---------------------------------------------------------------------------
-- 15. Make participant_visibility meaningful
--     Limited participants can only see:
--       - Event overview (via can_view_event, already works)
--       - all_participants documents (already works via document RLS)
--       - all_participants contacts (fixed above)
--     Limited participants CANNOT see:
--       - Schedule items
--       - Locations
--       - Services (other than their own account's)
--     Standard participants see everything a participant can see.
-- ---------------------------------------------------------------------------

-- Schedule: limited participants blocked
DROP POLICY IF EXISTS "Users can view schedule for events they can view" ON event_schedule_items;

CREATE POLICY "Users can view schedule for events they can view"
  ON event_schedule_items FOR SELECT
  USING (
    is_staff()
    OR (
      can_view_event(event_id)
      AND (
        -- Owner-account members always see schedule
        is_event_owner_member(event_id)
        -- Standard participants see schedule
        OR get_participant_visibility(event_id) = 'standard'
      )
    )
  );

-- Locations: limited participants blocked
DROP POLICY IF EXISTS "Users can view locations for events they can view" ON event_locations;

CREATE POLICY "Users can view locations for events they can view"
  ON event_locations FOR SELECT
  USING (
    is_staff()
    OR (
      can_view_event(event_id)
      AND (
        is_event_owner_member(event_id)
        OR get_participant_visibility(event_id) = 'standard'
      )
    )
  );

-- Services: limited participants can only see services linked to their own account
DROP POLICY IF EXISTS "Users can view services for events they can view" ON event_services;

CREATE POLICY "Users can view services for events they can view"
  ON event_services FOR SELECT
  USING (
    is_staff()
    OR (
      can_view_event(event_id)
      AND (
        -- Owner-account members see all services
        is_event_owner_member(event_id)
        -- Standard participants see all services
        OR get_participant_visibility(event_id) = 'standard'
        -- Limited participants only see services linked to their own account
        OR (
          get_participant_visibility(event_id) = 'limited'
          AND account_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.account_memberships am
            WHERE am.account_id = event_services.account_id
              AND am.profile_id = auth.uid()
          )
        )
      )
    )
  );
