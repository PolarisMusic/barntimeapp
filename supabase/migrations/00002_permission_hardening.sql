-- =============================================================================
-- Migration 2: Permission Hardening (Stages 1-5 of fix pass)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STAGE 1/2: New helper function for generic event-permission checks
-- ---------------------------------------------------------------------------

-- Check if the current user has a specific permission for an event
-- through their owner-account membership.
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
      JOIN public.account_membership_permissions amp
        ON amp.membership_id = am.id AND amp.permission_key = p_permission_key
      WHERE e.id = p_event_id
    );
$$;

-- Dedicated can_manage_services helper
CREATE OR REPLACE FUNCTION can_manage_services(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_event_permission(p_event_id, 'event.manage_services');
$$;

-- Dedicated can_manage_contacts (event-level) helper
CREATE OR REPLACE FUNCTION can_manage_event_contacts(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_event_permission(p_event_id, 'event.manage_contacts');
$$;

-- ---------------------------------------------------------------------------
-- STAGE 3: Event-scoped contact assignments
-- ---------------------------------------------------------------------------

CREATE TABLE event_contact_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES account_contacts(id) ON DELETE CASCADE,
  role_label  text,
  visibility  text NOT NULL DEFAULT 'owner_only',
  sort_order  integer NOT NULL DEFAULT 0,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, contact_id)
);

CREATE INDEX idx_event_contact_roles_event ON event_contact_roles(event_id);
CREATE INDEX idx_event_contact_roles_contact ON event_contact_roles(contact_id);

CREATE TRIGGER set_event_contact_roles_updated_at
  BEFORE UPDATE ON event_contact_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS for event_contact_roles
ALTER TABLE event_contact_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can do anything with event contact roles"
  ON event_contact_roles FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view event contact roles for events they can view"
  ON event_contact_roles FOR SELECT
  USING (can_view_event(event_id));

CREATE POLICY "Users with manage permission can insert event contact roles"
  ON event_contact_roles FOR INSERT
  WITH CHECK (can_manage_event_contacts(event_id));

CREATE POLICY "Users with manage permission can update event contact roles"
  ON event_contact_roles FOR UPDATE
  USING (can_manage_event_contacts(event_id));

CREATE POLICY "Users with manage permission can delete event contact roles"
  ON event_contact_roles FOR DELETE
  USING (can_manage_event_contacts(event_id));

-- ---------------------------------------------------------------------------
-- STAGE 4: Formalize participant visibility as enum
-- ---------------------------------------------------------------------------

CREATE TYPE participant_visibility AS ENUM ('limited', 'standard');

ALTER TABLE event_accounts
  ALTER COLUMN visibility DROP DEFAULT;
ALTER TABLE event_accounts
  ALTER COLUMN visibility TYPE participant_visibility
    USING CASE
      WHEN visibility = 'standard' THEN 'standard'::participant_visibility
      ELSE 'limited'::participant_visibility
    END;
ALTER TABLE event_accounts
  ALTER COLUMN visibility SET DEFAULT 'limited';

-- ---------------------------------------------------------------------------
-- STAGE 5: Remove specific_accounts from document_visibility
-- ---------------------------------------------------------------------------

-- Update any existing specific_accounts to owner_only before removing
UPDATE event_documents
  SET visibility = 'owner_only'
  WHERE visibility = 'specific_accounts';

-- Drop policy that depends on the visibility column before altering the type
DROP POLICY IF EXISTS "Owner-account members can view owner-only documents" ON event_documents;

-- Recreate the enum without specific_accounts
-- Postgres doesn't support removing enum values, so we rename + recreate
ALTER TYPE document_visibility RENAME TO document_visibility_old;

CREATE TYPE document_visibility AS ENUM ('owner_only', 'all_participants');

ALTER TABLE event_documents
  ALTER COLUMN visibility DROP DEFAULT;
ALTER TABLE event_documents
  ALTER COLUMN visibility TYPE document_visibility
    USING visibility::text::document_visibility;
ALTER TABLE event_documents
  ALTER COLUMN visibility SET DEFAULT 'owner_only';

DROP TYPE document_visibility_old;

-- ---------------------------------------------------------------------------
-- STAGE 4 cont: Update can_view_event to respect participant visibility
-- ---------------------------------------------------------------------------

-- Recreate can_view_event to incorporate participant_visibility
CREATE OR REPLACE FUNCTION can_view_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      -- Owner-account member with view permission
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.view_owned'
      WHERE e.id = p_event_id
    )
    OR EXISTS (
      -- Participant-account member with view permission and any visibility level
      SELECT 1
      FROM public.event_accounts ea
      JOIN public.account_memberships am ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.view_participant'
      WHERE ea.event_id = p_event_id
    );
$$;

-- Helper: is user viewing as participant (not owner)?
CREATE OR REPLACE FUNCTION is_event_participant(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_accounts ea
    JOIN public.account_memberships am ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
    WHERE ea.event_id = p_event_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
    WHERE e.id = p_event_id
  );
$$;

-- Helper: get participant visibility level for current user
CREATE OR REPLACE FUNCTION get_participant_visibility(p_event_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT ea.visibility::text
  FROM public.event_accounts ea
  JOIN public.account_memberships am ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
  WHERE ea.event_id = p_event_id
  LIMIT 1;
$$;

-- Update document RLS to properly handle the two-mode visibility
-- (The old policy was already dropped in STAGE 5 before the column type alter)

CREATE POLICY "Users can view documents based on visibility"
  ON event_documents FOR SELECT
  USING (
    is_staff()
    OR (
      can_view_event(event_id)
      AND (
        -- All-participants docs are visible to anyone who can view the event
        visibility = 'all_participants'
        -- Owner-only docs are only visible to owner-account members
        OR (
          visibility = 'owner_only'
          AND EXISTS (
            SELECT 1 FROM events e
            JOIN account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
            WHERE e.id = event_documents.event_id
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- STAGE 10 (partial): Schema corrections
-- ---------------------------------------------------------------------------

-- Add 'performer' to account_type
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'performer';

-- Add timezone to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Los_Angeles';

-- Add location_type and map_url to event_locations
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS location_type text;
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS map_url text;
