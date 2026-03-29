-- =============================================================================
-- Migration 3: Permission Model v2 — Role defaults + explicit overrides
-- =============================================================================
--
-- BEFORE: Default permissions were physically seeded into
-- account_membership_permissions on membership creation. Role change deleted
-- all permissions and re-seeded. This destroyed custom permission tailoring.
--
-- AFTER: has_account_permission() checks role defaults via
-- get_default_permissions() first, then checks explicit overrides in
-- account_membership_permissions. Rows in account_membership_permissions are
-- now ONLY explicit additions beyond the role's defaults.
--
-- This means:
-- - Changing a role DOES NOT wipe the explicit overrides table
-- - A viewer with an explicit 'vendor.confirm' grant keeps it across role changes
-- - Default permissions are always derived from the current role, not stored
-- =============================================================================

-- Drop the auto-seed triggers (they no longer apply)
DROP TRIGGER IF EXISTS on_membership_created ON account_memberships;
DROP TRIGGER IF EXISTS on_membership_role_changed ON account_memberships;
DROP FUNCTION IF EXISTS seed_membership_permissions();
DROP FUNCTION IF EXISTS reseed_membership_permissions();

-- Clean up: remove rows that are just role defaults (they're now computed)
-- Keep only rows that are explicit additions beyond the role's defaults.
DELETE FROM account_membership_permissions
WHERE id IN (
  SELECT amp.id
  FROM account_membership_permissions amp
  JOIN account_memberships am ON am.id = amp.membership_id
  WHERE amp.permission_key = ANY(get_default_permissions(am.account_role))
);

-- Rewrite has_account_permission to check role defaults OR explicit overrides
CREATE OR REPLACE FUNCTION has_account_permission(p_account_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_memberships am
    WHERE am.account_id = p_account_id
      AND am.profile_id = auth.uid()
      AND (
        -- Permission is a default for this role
        p_permission_key = ANY(public.get_default_permissions(am.account_role))
        -- OR permission is an explicit override
        OR EXISTS (
          SELECT 1
          FROM public.account_membership_permissions amp
          WHERE amp.membership_id = am.id
            AND amp.permission_key = p_permission_key
        )
      )
  );
$$;

-- Also add a helper to list all effective permissions for a membership
CREATE OR REPLACE FUNCTION get_effective_permissions(p_membership_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT array_agg(DISTINCT perm) FROM (
    -- Role defaults
    SELECT unnest(public.get_default_permissions(am.account_role)) AS perm
    FROM public.account_memberships am
    WHERE am.id = p_membership_id
    UNION
    -- Explicit overrides
    SELECT amp.permission_key AS perm
    FROM public.account_membership_permissions amp
    WHERE amp.membership_id = p_membership_id
  ) combined;
$$;
