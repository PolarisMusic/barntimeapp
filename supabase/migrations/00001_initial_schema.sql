-- =============================================================================
-- Barn Time Portal — Initial Schema Migration
-- Stages 2-4: Tables, Enums, Permission Model, Helper Functions, RLS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE platform_role AS ENUM ('platform_admin', 'staff', 'standard');
CREATE TYPE account_role AS ENUM ('account_owner', 'account_manager', 'event_coordinator', 'viewer');
CREATE TYPE account_type AS ENUM ('client', 'vendor', 'venue', 'internal');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'finalized', 'archived');
CREATE TYPE service_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE document_type AS ENUM ('site_map', 'run_sheet', 'vendor_packet', 'insurance_compliance', 'stage_plot', 'parking_load_in', 'misc');
CREATE TYPE document_visibility AS ENUM ('owner_only', 'all_participants', 'specific_accounts');

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  platform_role platform_role NOT NULL DEFAULT 'standard',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- ACCOUNTS
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        account_type NOT NULL DEFAULT 'client',
  status      account_status NOT NULL DEFAULT 'active',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ACCOUNT MEMBERSHIPS
-- ---------------------------------------------------------------------------
CREATE TABLE account_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_role account_role NOT NULL DEFAULT 'viewer',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, profile_id)
);

CREATE INDEX idx_memberships_account ON account_memberships(account_id);
CREATE INDEX idx_memberships_profile ON account_memberships(profile_id);

-- ---------------------------------------------------------------------------
-- ACCOUNT MEMBERSHIP PERMISSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE account_membership_permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES account_memberships(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, permission_key)
);

CREATE INDEX idx_perms_membership ON account_membership_permissions(membership_id);

-- ---------------------------------------------------------------------------
-- ACCOUNT CONTACTS
-- ---------------------------------------------------------------------------
CREATE TABLE account_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,
  role_label  text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_account ON account_contacts(account_id);

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  name              text NOT NULL,
  status            event_status NOT NULL DEFAULT 'draft',
  start_date        date,
  end_date          date,
  description       text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_owner ON events(owner_account_id);

-- ---------------------------------------------------------------------------
-- EVENT ACCOUNTS (participant accounts, NOT the owner)
-- ---------------------------------------------------------------------------
CREATE TABLE event_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_label  text,
  visibility  text NOT NULL DEFAULT 'limited',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, account_id)
);

CREATE INDEX idx_event_accounts_event ON event_accounts(event_id);
CREATE INDEX idx_event_accounts_account ON event_accounts(account_id);

-- ---------------------------------------------------------------------------
-- EVENT LOCATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE event_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_locations_event ON event_locations(event_id);

-- ---------------------------------------------------------------------------
-- EVENT SERVICES
-- ---------------------------------------------------------------------------
CREATE TABLE event_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  account_id    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  status        service_status NOT NULL DEFAULT 'pending',
  details       jsonb,
  confirmed_by  uuid REFERENCES profiles(id),
  confirmed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_services_event ON event_services(event_id);

-- ---------------------------------------------------------------------------
-- EVENT SCHEDULE ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE event_schedule_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title       text NOT NULL,
  start_time  timestamptz,
  end_time    timestamptz,
  location_id uuid REFERENCES event_locations(id) ON DELETE SET NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_items_event ON event_schedule_items(event_id);

-- ---------------------------------------------------------------------------
-- EVENT DOCUMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE event_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by   uuid NOT NULL REFERENCES profiles(id),
  name          text NOT NULL,
  file_path     text NOT NULL,
  file_type     text,
  document_type document_type NOT NULL DEFAULT 'misc',
  visibility    document_visibility NOT NULL DEFAULT 'owner_only',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_documents_event ON event_documents(event_id);

-- ---------------------------------------------------------------------------
-- ACTIVITY LOG
-- ---------------------------------------------------------------------------
CREATE TABLE activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  action      text NOT NULL,
  summary     text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_memberships_updated_at BEFORE UPDATE ON account_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON account_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_locations_updated_at BEFORE UPDATE ON event_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_services_updated_at BEFORE UPDATE ON event_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_schedule_updated_at BEFORE UPDATE ON event_schedule_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_documents_updated_at BEFORE UPDATE ON event_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- STAGE 3 — DEFAULT PERMISSION SEEDING
-- =============================================================================

-- Function to get default permissions for an account role
CREATE OR REPLACE FUNCTION get_default_permissions(role account_role)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  CASE role
    WHEN 'account_owner' THEN
      RETURN ARRAY[
        'account.manage_members',
        'account.manage_contacts',
        'event.create',
        'event.view_owned',
        'event.edit_owned',
        'event.link_participants',
        'event.manage_schedule',
        'event.manage_services',
        'event.manage_documents',
        'event.manage_contacts',
        'vendor.confirm',
        'event.view_participant'
      ];
    WHEN 'account_manager' THEN
      RETURN ARRAY[
        'account.manage_contacts',
        'event.create',
        'event.view_owned',
        'event.edit_owned',
        'event.link_participants',
        'event.manage_schedule',
        'event.manage_services',
        'event.manage_documents',
        'event.manage_contacts',
        'vendor.confirm',
        'event.view_participant'
      ];
    WHEN 'event_coordinator' THEN
      RETURN ARRAY[
        'event.view_owned',
        'event.edit_owned',
        'event.manage_schedule',
        'event.manage_services',
        'event.manage_documents',
        'event.manage_contacts',
        'event.view_participant'
      ];
    WHEN 'viewer' THEN
      RETURN ARRAY[
        'event.view_owned',
        'event.view_participant'
      ];
    ELSE
      RETURN ARRAY[]::text[];
  END CASE;
END;
$$;

-- Auto-seed permissions when a membership is created
CREATE OR REPLACE FUNCTION seed_membership_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  perm text;
BEGIN
  FOREACH perm IN ARRAY get_default_permissions(NEW.account_role)
  LOOP
    INSERT INTO account_membership_permissions (membership_id, permission_key)
    VALUES (NEW.id, perm)
    ON CONFLICT (membership_id, permission_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_membership_created
  AFTER INSERT ON account_memberships
  FOR EACH ROW EXECUTE FUNCTION seed_membership_permissions();

-- Re-seed when role changes
CREATE OR REPLACE FUNCTION reseed_membership_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  perm text;
BEGIN
  IF OLD.account_role IS DISTINCT FROM NEW.account_role THEN
    -- Remove old default permissions
    DELETE FROM account_membership_permissions
    WHERE membership_id = NEW.id;
    -- Insert new defaults
    FOREACH perm IN ARRAY get_default_permissions(NEW.account_role)
    LOOP
      INSERT INTO account_membership_permissions (membership_id, permission_key)
      VALUES (NEW.id, perm)
      ON CONFLICT (membership_id, permission_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_membership_role_changed
  AFTER UPDATE ON account_memberships
  FOR EACH ROW EXECUTE FUNCTION reseed_membership_permissions();

-- =============================================================================
-- STAGE 4 — AUTHORIZATION HELPER FUNCTIONS
-- =============================================================================

-- Is the current user a platform admin?
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND platform_role = 'platform_admin'
  );
$$;

-- Is the current user staff (or admin)?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND platform_role IN ('platform_admin', 'staff')
  );
$$;

-- Is the current user a member of a given account?
CREATE OR REPLACE FUNCTION is_account_member(p_account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_memberships
    WHERE account_id = p_account_id
      AND profile_id = auth.uid()
  );
$$;

-- Does the current user have a specific permission in an account?
CREATE OR REPLACE FUNCTION has_account_permission(p_account_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_memberships am
    JOIN public.account_membership_permissions amp ON amp.membership_id = am.id
    WHERE am.account_id = p_account_id
      AND am.profile_id = auth.uid()
      AND amp.permission_key = p_permission_key
  );
$$;

-- Can the current user view a given event?
-- Staff/admin: always. Owner-account member with event.view_owned: yes.
-- Participant-account member with event.view_participant: yes.
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
      -- Participant-account member with view permission
      SELECT 1
      FROM public.event_accounts ea
      JOIN public.account_memberships am ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.view_participant'
      WHERE ea.event_id = p_event_id
    );
$$;

-- Can the current user edit a given event?
CREATE OR REPLACE FUNCTION can_edit_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.edit_owned'
      WHERE e.id = p_event_id
    );
$$;

-- Can the current user manage event participants?
CREATE OR REPLACE FUNCTION can_manage_event_participants(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.link_participants'
      WHERE e.id = p_event_id
    );
$$;

-- Can the current user confirm vendors for an event?
CREATE OR REPLACE FUNCTION can_confirm_vendor(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'vendor.confirm'
      WHERE e.id = p_event_id
    );
$$;

-- Can the current user manage the schedule for an event?
CREATE OR REPLACE FUNCTION can_manage_schedule(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_schedule'
      WHERE e.id = p_event_id
    );
$$;

-- Can the current user manage documents for an event?
CREATE OR REPLACE FUNCTION can_manage_documents(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_documents'
      WHERE e.id = p_event_id
    );
$$;

-- =============================================================================
-- STAGE 4 — ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_membership_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (is_staff());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Staff can update any profile"
  ON profiles FOR UPDATE
  USING (is_staff());

-- ---- ACCOUNTS ----
CREATE POLICY "Staff can do anything with accounts"
  ON accounts FOR ALL
  USING (is_staff());

CREATE POLICY "Members can view their accounts"
  ON accounts FOR SELECT
  USING (is_account_member(id));

-- ---- ACCOUNT MEMBERSHIPS ----
CREATE POLICY "Staff can do anything with memberships"
  ON account_memberships FOR ALL
  USING (is_staff());

CREATE POLICY "Members can view memberships in their accounts"
  ON account_memberships FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY "Account managers can manage memberships"
  ON account_memberships FOR INSERT
  WITH CHECK (has_account_permission(account_id, 'account.manage_members'));

CREATE POLICY "Account managers can update memberships"
  ON account_memberships FOR UPDATE
  USING (has_account_permission(account_id, 'account.manage_members'));

CREATE POLICY "Account managers can delete memberships"
  ON account_memberships FOR DELETE
  USING (has_account_permission(account_id, 'account.manage_members'));

-- ---- ACCOUNT MEMBERSHIP PERMISSIONS ----
CREATE POLICY "Staff can do anything with permissions"
  ON account_membership_permissions FOR ALL
  USING (is_staff());

CREATE POLICY "Members can view permissions in their accounts"
  ON account_membership_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_memberships am
      WHERE am.id = account_membership_permissions.membership_id
        AND is_account_member(am.account_id)
    )
  );

-- ---- ACCOUNT CONTACTS ----
CREATE POLICY "Staff can do anything with contacts"
  ON account_contacts FOR ALL
  USING (is_staff());

CREATE POLICY "Members can view contacts in their accounts"
  ON account_contacts FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY "Members with permission can manage contacts"
  ON account_contacts FOR INSERT
  WITH CHECK (has_account_permission(account_id, 'account.manage_contacts'));

CREATE POLICY "Members with permission can update contacts"
  ON account_contacts FOR UPDATE
  USING (has_account_permission(account_id, 'account.manage_contacts'));

CREATE POLICY "Members with permission can delete contacts"
  ON account_contacts FOR DELETE
  USING (has_account_permission(account_id, 'account.manage_contacts'));

-- ---- EVENTS ----
CREATE POLICY "Staff can do anything with events"
  ON events FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view events they have access to"
  ON events FOR SELECT
  USING (can_view_event(id));

CREATE POLICY "Users can update events they can edit"
  ON events FOR UPDATE
  USING (can_edit_event(id));

-- ---- EVENT ACCOUNTS ----
CREATE POLICY "Staff can do anything with event accounts"
  ON event_accounts FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view event accounts for events they can view"
  ON event_accounts FOR SELECT
  USING (can_view_event(event_id));

CREATE POLICY "Users can manage participants if they have permission"
  ON event_accounts FOR INSERT
  WITH CHECK (can_manage_event_participants(event_id));

CREATE POLICY "Users can update participants if they have permission"
  ON event_accounts FOR UPDATE
  USING (can_manage_event_participants(event_id));

CREATE POLICY "Users can remove participants if they have permission"
  ON event_accounts FOR DELETE
  USING (can_manage_event_participants(event_id));

-- ---- EVENT LOCATIONS ----
CREATE POLICY "Staff can do anything with locations"
  ON event_locations FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view locations for events they can view"
  ON event_locations FOR SELECT
  USING (can_view_event(event_id));

CREATE POLICY "Users can manage locations for events they can edit"
  ON event_locations FOR INSERT
  WITH CHECK (can_edit_event(event_id));

CREATE POLICY "Users can update locations for events they can edit"
  ON event_locations FOR UPDATE
  USING (can_edit_event(event_id));

CREATE POLICY "Users can delete locations for events they can edit"
  ON event_locations FOR DELETE
  USING (can_edit_event(event_id));

-- ---- EVENT SERVICES ----
CREATE POLICY "Staff can do anything with services"
  ON event_services FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view services for events they can view"
  ON event_services FOR SELECT
  USING (can_view_event(event_id));

CREATE POLICY "Users with manage permission can insert services"
  ON event_services FOR INSERT
  WITH CHECK (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_services'
      WHERE e.id = event_services.event_id
    )
  );

CREATE POLICY "Users with manage permission can update services"
  ON event_services FOR UPDATE
  USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_services'
      WHERE e.id = event_services.event_id
    )
  );

CREATE POLICY "Users with manage permission can delete services"
  ON event_services FOR DELETE
  USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
      JOIN account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_services'
      WHERE e.id = event_services.event_id
    )
  );

-- ---- EVENT SCHEDULE ITEMS ----
CREATE POLICY "Staff can do anything with schedule items"
  ON event_schedule_items FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view schedule for events they can view"
  ON event_schedule_items FOR SELECT
  USING (can_view_event(event_id));

CREATE POLICY "Users with schedule permission can insert items"
  ON event_schedule_items FOR INSERT
  WITH CHECK (can_manage_schedule(event_id));

CREATE POLICY "Users with schedule permission can update items"
  ON event_schedule_items FOR UPDATE
  USING (can_manage_schedule(event_id));

CREATE POLICY "Users with schedule permission can delete items"
  ON event_schedule_items FOR DELETE
  USING (can_manage_schedule(event_id));

-- ---- EVENT DOCUMENTS ----
CREATE POLICY "Staff can do anything with documents"
  ON event_documents FOR ALL
  USING (is_staff());

CREATE POLICY "Owner-account members can view owner-only documents"
  ON event_documents FOR SELECT
  USING (
    can_view_event(event_id)
    AND (
      visibility = 'all_participants'
      OR (
        visibility = 'owner_only'
        AND EXISTS (
          SELECT 1 FROM events e
          JOIN account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
          WHERE e.id = event_documents.event_id
        )
      )
    )
  );

CREATE POLICY "Users with document permission can insert documents"
  ON event_documents FOR INSERT
  WITH CHECK (can_manage_documents(event_id));

CREATE POLICY "Users with document permission can update documents"
  ON event_documents FOR UPDATE
  USING (can_manage_documents(event_id));

CREATE POLICY "Users with document permission can delete documents"
  ON event_documents FOR DELETE
  USING (can_manage_documents(event_id));

-- ---- ACTIVITY LOG ----
CREATE POLICY "Staff can view all activity"
  ON activity_log FOR ALL
  USING (is_staff());

CREATE POLICY "Users can view activity for their accounts"
  ON activity_log FOR SELECT
  USING (
    -- Activity on events they can view
    (entity_type = 'event' AND can_view_event(entity_id))
    -- Activity on accounts they belong to
    OR (entity_type = 'account' AND is_account_member(entity_id))
    -- Own activity
    OR actor_id = auth.uid()
  );

-- =============================================================================
-- STAGE 10 — READ MODEL VIEWS
-- =============================================================================

-- Dashboard view: events the current user can see through their memberships
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
  JOIN public.account_memberships am ON am.account_id = e.owner_account_id AND am.profile_id = auth.uid()
  JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.view_owned'

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
  JOIN public.account_memberships am ON am.account_id = ea.account_id AND am.profile_id = auth.uid()
  JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.view_participant'
$$;

-- Event summary RPC
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
  can_edit boolean,
  can_manage_participants boolean,
  can_manage_services boolean,
  can_manage_schedule_items boolean,
  can_manage_docs boolean,
  can_confirm_vendors boolean
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
    public.can_edit_event(e.id),
    public.can_manage_event_participants(e.id),
    public.is_staff() OR EXISTS (
      SELECT 1 FROM public.events ev
      JOIN public.account_memberships am ON am.account_id = ev.owner_account_id AND am.profile_id = auth.uid()
      JOIN public.account_membership_permissions amp ON amp.membership_id = am.id AND amp.permission_key = 'event.manage_services'
      WHERE ev.id = e.id
    ),
    public.can_manage_schedule(e.id),
    public.can_manage_documents(e.id),
    public.can_confirm_vendor(e.id)
  FROM public.events e
  JOIN public.accounts a ON a.id = e.owner_account_id
  WHERE e.id = p_event_id
    AND public.can_view_event(e.id);
$$;
