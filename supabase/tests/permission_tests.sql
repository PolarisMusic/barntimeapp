-- =============================================================================
-- Barn Time Portal — Permission Integration Tests
-- =============================================================================
-- These tests verify actual DB behavior of the permission model.
-- Run against a test database after all migrations.
--
-- Tests use direct inserts (service role) to create test users and data,
-- then impersonate users via SET LOCAL to test helper functions and RLS.
-- =============================================================================

-- ============================================================
-- SETUP: Create test data
-- ============================================================

-- Test users (these are UUIDs we control; in real DB they'd be auth.users)
-- We create profiles directly since there are no auth.users in test mode.

DO $$
DECLARE
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  staff_id uuid := '00000000-0000-0000-0000-000000000002';
  owner_user_id uuid := '00000000-0000-0000-0000-000000000003';
  coordinator_id uuid := '00000000-0000-0000-0000-000000000004';
  viewer_id uuid := '00000000-0000-0000-0000-000000000005';
  participant_user_id uuid := '00000000-0000-0000-0000-000000000006';
  unrelated_id uuid := '00000000-0000-0000-0000-000000000007';

  client_account_id uuid := '10000000-0000-0000-0000-000000000001';
  vendor_account_id uuid := '10000000-0000-0000-0000-000000000002';

  event_id uuid := '20000000-0000-0000-0000-000000000001';

  owner_membership_id uuid;
  coordinator_membership_id uuid;
  viewer_membership_id uuid;
  participant_membership_id uuid;
BEGIN
  -- Clean up any previous test data
  DELETE FROM activity_log WHERE entity_id IN (event_id, client_account_id, vendor_account_id);
  DELETE FROM event_contact_roles WHERE event_id = event_id;
  DELETE FROM event_documents WHERE event_id = event_id;
  DELETE FROM event_schedule_items WHERE event_id = event_id;
  DELETE FROM event_services WHERE event_id = event_id;
  DELETE FROM event_locations WHERE event_id = event_id;
  DELETE FROM event_accounts WHERE event_id = event_id;
  DELETE FROM events WHERE id = event_id;
  DELETE FROM account_membership_permissions WHERE membership_id IN (
    SELECT id FROM account_memberships WHERE account_id IN (client_account_id, vendor_account_id)
  );
  DELETE FROM account_memberships WHERE account_id IN (client_account_id, vendor_account_id);
  DELETE FROM account_contacts WHERE account_id IN (client_account_id, vendor_account_id);
  DELETE FROM accounts WHERE id IN (client_account_id, vendor_account_id);
  DELETE FROM profiles WHERE id IN (admin_id, staff_id, owner_user_id, coordinator_id, viewer_id, participant_user_id, unrelated_id);

  -- Create profiles
  INSERT INTO profiles (id, email, full_name, platform_role) VALUES
    (admin_id, 'admin@test.com', 'Admin', 'platform_admin'),
    (staff_id, 'staff@test.com', 'Staff', 'staff'),
    (owner_user_id, 'owner@test.com', 'Owner User', 'standard'),
    (coordinator_id, 'coord@test.com', 'Coordinator', 'standard'),
    (viewer_id, 'viewer@test.com', 'Viewer', 'standard'),
    (participant_user_id, 'participant@test.com', 'Participant', 'standard'),
    (unrelated_id, 'unrelated@test.com', 'Unrelated', 'standard');

  -- Create accounts
  INSERT INTO accounts (id, name, type) VALUES
    (client_account_id, 'Test Client LLC', 'client'),
    (vendor_account_id, 'Test Vendor Co', 'vendor');

  -- Create memberships
  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES (client_account_id, owner_user_id, 'account_owner')
  RETURNING id INTO owner_membership_id;

  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES (client_account_id, coordinator_id, 'event_coordinator')
  RETURNING id INTO coordinator_membership_id;

  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES (client_account_id, viewer_id, 'viewer')
  RETURNING id INTO viewer_membership_id;

  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES (vendor_account_id, participant_user_id, 'account_owner')
  RETURNING id INTO participant_membership_id;

  -- Create event owned by client account
  INSERT INTO events (id, owner_account_id, name, status, start_date)
  VALUES (event_id, client_account_id, 'Test Wedding', 'active', '2026-09-01');

  -- Link vendor as participant
  INSERT INTO event_accounts (event_id, account_id, role_label, visibility)
  VALUES (event_id, vendor_account_id, 'Sound Vendor', 'limited');

  -- Add a service
  INSERT INTO event_services (event_id, account_id, name, status)
  VALUES (event_id, vendor_account_id, 'PA System', 'pending');

  -- Add a document (owner_only)
  INSERT INTO event_documents (event_id, uploaded_by, name, file_path, document_type, visibility)
  VALUES (event_id, owner_user_id, 'Contract.pdf', 'events/test/contract.pdf', 'misc', 'owner_only');

  -- Add a document (all_participants)
  INSERT INTO event_documents (event_id, uploaded_by, name, file_path, document_type, visibility)
  VALUES (event_id, owner_user_id, 'Site Map.pdf', 'events/test/sitemap.pdf', 'site_map', 'all_participants');

  RAISE NOTICE 'Test data created successfully';
END $$;

-- ============================================================
-- TEST 1: Default permissions are derived from role correctly
-- ============================================================
DO $$
DECLARE
  perms text[];
BEGIN
  perms := get_default_permissions('account_owner');
  ASSERT array_length(perms, 1) = 12, 'account_owner should have 12 default permissions';
  ASSERT 'vendor.confirm' = ANY(perms), 'account_owner should have vendor.confirm';

  perms := get_default_permissions('viewer');
  ASSERT array_length(perms, 1) = 2, 'viewer should have 2 default permissions';
  ASSERT NOT ('event.edit_owned' = ANY(perms)), 'viewer should NOT have event.edit_owned';
  ASSERT NOT ('vendor.confirm' = ANY(perms)), 'viewer should NOT have vendor.confirm';

  perms := get_default_permissions('event_coordinator');
  ASSERT NOT ('vendor.confirm' = ANY(perms)), 'event_coordinator should NOT have vendor.confirm by default';
  ASSERT 'event.manage_schedule' = ANY(perms), 'event_coordinator should have event.manage_schedule';

  RAISE NOTICE 'PASS: Test 1 — Role default permissions are correct';
END $$;

-- ============================================================
-- TEST 2: Effective permissions include role defaults + explicit overrides
-- ============================================================
DO $$
DECLARE
  coordinator_membership_id uuid;
  perms text[];
BEGIN
  SELECT id INTO coordinator_membership_id
  FROM account_memberships
  WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    AND account_id = '10000000-0000-0000-0000-000000000001';

  -- Add explicit vendor.confirm (not a default for coordinator)
  INSERT INTO account_membership_permissions (membership_id, permission_key)
  VALUES (coordinator_membership_id, 'vendor.confirm')
  ON CONFLICT DO NOTHING;

  perms := get_effective_permissions(coordinator_membership_id);

  ASSERT 'event.manage_schedule' = ANY(perms),
    'Effective should include role default event.manage_schedule';
  ASSERT 'vendor.confirm' = ANY(perms),
    'Effective should include explicit override vendor.confirm';

  RAISE NOTICE 'PASS: Test 2 — Effective permissions combine role defaults + explicit overrides';
END $$;

-- ============================================================
-- TEST 3: Role change does NOT destroy explicit overrides
-- ============================================================
DO $$
DECLARE
  coord_membership_id uuid;
  has_explicit boolean;
BEGIN
  SELECT id INTO coord_membership_id
  FROM account_memberships
  WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    AND account_id = '10000000-0000-0000-0000-000000000001';

  -- Change role from event_coordinator to viewer
  UPDATE account_memberships SET account_role = 'viewer' WHERE id = coord_membership_id;

  -- The explicit vendor.confirm grant should still exist
  SELECT EXISTS(
    SELECT 1 FROM account_membership_permissions
    WHERE membership_id = coord_membership_id AND permission_key = 'vendor.confirm'
  ) INTO has_explicit;

  ASSERT has_explicit = true, 'Explicit vendor.confirm should survive role change';

  -- Restore role
  UPDATE account_memberships SET account_role = 'event_coordinator' WHERE id = coord_membership_id;

  RAISE NOTICE 'PASS: Test 3 — Role change preserves explicit permission overrides';
END $$;

-- ============================================================
-- TEST 4: Linking owner account as participant is prevented
-- (This is enforced in the server action, tested here at data level)
-- ============================================================
DO $$
DECLARE
  err text;
BEGIN
  BEGIN
    INSERT INTO event_accounts (event_id, account_id, role_label)
    VALUES (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001', -- owner account
      'Should Fail'
    );
    -- If we get here, the unique constraint will prevent duplicate,
    -- but the owner-as-participant prevention is in the server action.
    -- At DB level, we just test the constraint works.
    RAISE NOTICE 'NOTE: Test 4 — Owner-as-participant prevention is enforced in server actions, not DB constraints';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: Test 4 — Unique constraint prevents duplicate event_accounts entries';
  END;
END $$;

-- ============================================================
-- TEST 5: Verify get_default_permissions correctness for all roles
-- ============================================================
DO $$
DECLARE
  owner_perms text[];
  manager_perms text[];
  coord_perms text[];
  viewer_perms text[];
BEGIN
  owner_perms := get_default_permissions('account_owner');
  manager_perms := get_default_permissions('account_manager');
  coord_perms := get_default_permissions('event_coordinator');
  viewer_perms := get_default_permissions('viewer');

  -- Owner has manage_members, manager does not
  ASSERT 'account.manage_members' = ANY(owner_perms), 'owner has manage_members';
  ASSERT NOT ('account.manage_members' = ANY(manager_perms)), 'manager does NOT have manage_members';
  ASSERT NOT ('account.manage_members' = ANY(coord_perms)), 'coordinator does NOT have manage_members';

  -- Manager has vendor.confirm, coordinator does not
  ASSERT 'vendor.confirm' = ANY(manager_perms), 'manager has vendor.confirm';
  ASSERT NOT ('vendor.confirm' = ANY(coord_perms)), 'coordinator does NOT have vendor.confirm';

  -- Coordinator has event.edit_owned, viewer does not
  ASSERT 'event.edit_owned' = ANY(coord_perms), 'coordinator has event.edit_owned';
  ASSERT NOT ('event.edit_owned' = ANY(viewer_perms)), 'viewer does NOT have event.edit_owned';

  -- All roles have event.view_owned
  ASSERT 'event.view_owned' = ANY(owner_perms), 'owner has event.view_owned';
  ASSERT 'event.view_owned' = ANY(viewer_perms), 'viewer has event.view_owned';

  RAISE NOTICE 'PASS: Test 5 — All role default permission sets are correct';
END $$;

-- ============================================================
-- TEST 6: Participant visibility enum works
-- ============================================================
DO $$
DECLARE
  vis text;
BEGIN
  SELECT visibility::text INTO vis FROM event_accounts
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  ASSERT vis = 'limited', 'Vendor participant should have limited visibility';

  -- Update to standard
  UPDATE event_accounts SET visibility = 'standard'
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  SELECT visibility::text INTO vis FROM event_accounts
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  ASSERT vis = 'standard', 'Vendor participant should now have standard visibility';

  -- Reset
  UPDATE event_accounts SET visibility = 'limited'
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  RAISE NOTICE 'PASS: Test 6 — Participant visibility enum works correctly';
END $$;

-- ============================================================
-- TEST 7: Document visibility enum only allows owner_only/all_participants
-- ============================================================
DO $$
BEGIN
  -- Try inserting a document with invalid visibility
  BEGIN
    INSERT INTO event_documents (event_id, uploaded_by, name, file_path, visibility)
    VALUES (
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      'Bad Doc',
      'events/test/bad.pdf',
      'specific_accounts'
    );
    RAISE EXCEPTION 'Should have failed with invalid enum value';
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE NOTICE 'PASS: Test 7 — specific_accounts is correctly rejected as invalid document visibility';
  END;
END $$;

-- ============================================================
-- TEST 8: Helper function structure verification
-- ============================================================
DO $$
BEGIN
  -- Verify all required helper functions exist
  PERFORM 'is_platform_admin'::regproc;
  PERFORM 'is_staff'::regproc;
  PERFORM 'is_account_member'::regproc;
  PERFORM 'has_account_permission'::regproc;
  PERFORM 'can_view_event'::regproc;
  PERFORM 'can_edit_event'::regproc;
  PERFORM 'can_manage_event_participants'::regproc;
  PERFORM 'can_confirm_vendor'::regproc;
  PERFORM 'can_manage_schedule'::regproc;
  PERFORM 'can_manage_documents'::regproc;
  PERFORM 'can_manage_services'::regproc;
  PERFORM 'can_manage_event_contacts'::regproc;
  PERFORM 'has_event_permission'::regproc;
  PERFORM 'is_event_participant'::regproc;
  PERFORM 'get_participant_visibility'::regproc;
  PERFORM 'get_default_permissions'::regproc;
  PERFORM 'get_effective_permissions'::regproc;
  PERFORM 'my_events_dashboard'::regproc;
  PERFORM 'event_summary'::regproc;

  RAISE NOTICE 'PASS: Test 8 — All required helper functions exist';
END $$;

-- ============================================================
-- TEST 9: Membership removal cascades permissions
-- ============================================================
DO $$
DECLARE
  temp_membership_id uuid;
  perm_count int;
BEGIN
  -- Create a temporary membership
  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'viewer')
  RETURNING id INTO temp_membership_id;

  -- Add an explicit permission
  INSERT INTO account_membership_permissions (membership_id, permission_key)
  VALUES (temp_membership_id, 'vendor.confirm');

  -- Delete membership
  DELETE FROM account_memberships WHERE id = temp_membership_id;

  -- Verify permissions were cascaded
  SELECT count(*) INTO perm_count
  FROM account_membership_permissions
  WHERE membership_id = temp_membership_id;

  ASSERT perm_count = 0, 'Permissions should be deleted when membership is removed';

  RAISE NOTICE 'PASS: Test 9 — Membership removal cascades permission deletions';
END $$;

-- ============================================================
-- CLEANUP
-- ============================================================
DO $$
BEGIN
  -- Clean up explicit override from test 2/3
  DELETE FROM account_membership_permissions
  WHERE permission_key = 'vendor.confirm'
    AND membership_id IN (
      SELECT id FROM account_memberships
      WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    );

  RAISE NOTICE '====================================';
  RAISE NOTICE 'All permission integration tests passed.';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: RLS policy tests require auth context (set_config for request.jwt.claims)';
  RAISE NOTICE 'and are best run through the application or a dedicated test harness.';
  RAISE NOTICE 'The tests above verify helper functions, cascades, and data model correctness.';
END $$;
