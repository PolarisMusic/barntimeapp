-- =============================================================================
-- Barn Time Portal — Permission Integration Tests
-- =============================================================================
-- Run against a test database after all migrations (00001–00004).
--
-- Two test sections:
--   A. Data-level tests (service-role context, no auth impersonation)
--   B. Auth-context tests (impersonate users via request.jwt.claims + role)
--
-- Auth impersonation pattern:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub":"<user-uuid>"}';
-- This makes auth.uid() return the user's UUID for the duration of the TX.
-- =============================================================================

-- ============================================================
-- SETUP: Create test data (runs as service role / superuser)
-- ============================================================
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
  contact_id uuid;
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

  -- Create memberships (no auto-seed triggers; defaults are computed)
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

  -- Link vendor as participant with LIMITED visibility
  INSERT INTO event_accounts (event_id, account_id, role_label, visibility)
  VALUES (event_id, vendor_account_id, 'Sound Vendor', 'limited');

  -- Add services
  INSERT INTO event_services (event_id, account_id, name, status)
  VALUES
    (event_id, vendor_account_id, 'PA System', 'pending'),
    (event_id, NULL, 'Catering', 'confirmed');

  -- Add schedule items
  INSERT INTO event_schedule_items (event_id, title, sort_order)
  VALUES (event_id, 'Ceremony', 1), (event_id, 'Reception', 2);

  -- Add locations
  INSERT INTO event_locations (event_id, name, address)
  VALUES (event_id, 'Main Barn', '123 Farm Rd');

  -- Add documents
  INSERT INTO event_documents (event_id, uploaded_by, name, file_path, document_type, visibility)
  VALUES
    (event_id, owner_user_id, 'Contract.pdf', 'events/test/contract.pdf', 'misc', 'owner_only'),
    (event_id, owner_user_id, 'Site Map.pdf', 'events/test/sitemap.pdf', 'site_map', 'all_participants');

  -- Add contacts
  INSERT INTO account_contacts (id, account_id, name, email, role_label)
  VALUES (gen_random_uuid(), client_account_id, 'Jane Planner', 'jane@test.com', 'Lead Planner')
  RETURNING id INTO contact_id;

  INSERT INTO event_contact_roles (event_id, contact_id, role_label, visibility)
  VALUES
    (event_id, contact_id, 'Lead Planner', 'owner_only');

  -- Add another contact visible to all participants
  INSERT INTO account_contacts (id, account_id, name, email, role_label)
  VALUES (gen_random_uuid(), client_account_id, 'Bob Sound', 'bob@test.com', 'Sound Tech')
  RETURNING id INTO contact_id;

  INSERT INTO event_contact_roles (event_id, contact_id, role_label, visibility)
  VALUES
    (event_id, contact_id, 'Sound Tech', 'all_participants');

  RAISE NOTICE 'Test data created successfully';
END $$;


-- ============================================================
-- SECTION A: DATA-LEVEL TESTS (no auth context needed)
-- ============================================================

-- TEST A1: Default permissions are derived from role correctly
DO $$
DECLARE
  perms text[];
BEGIN
  perms := get_default_permissions('account_owner');
  ASSERT array_length(perms, 1) = 12, 'account_owner should have 12 default permissions, got ' || array_length(perms, 1);
  ASSERT 'vendor.confirm' = ANY(perms), 'account_owner should have vendor.confirm';

  perms := get_default_permissions('viewer');
  ASSERT array_length(perms, 1) = 2, 'viewer should have 2 default permissions';
  ASSERT NOT ('event.edit_owned' = ANY(perms)), 'viewer should NOT have event.edit_owned';

  perms := get_default_permissions('event_coordinator');
  ASSERT NOT ('vendor.confirm' = ANY(perms)), 'event_coordinator should NOT have vendor.confirm';
  ASSERT 'event.manage_schedule' = ANY(perms), 'event_coordinator should have event.manage_schedule';

  RAISE NOTICE 'PASS: A1 — Role default permissions are correct';
END $$;

-- TEST A2: Effective permissions include role defaults + explicit overrides
DO $$
DECLARE
  coordinator_membership_id uuid;
  perms text[];
BEGIN
  SELECT id INTO coordinator_membership_id
  FROM account_memberships
  WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    AND account_id = '10000000-0000-0000-0000-000000000001';

  INSERT INTO account_membership_permissions (membership_id, permission_key)
  VALUES (coordinator_membership_id, 'vendor.confirm')
  ON CONFLICT DO NOTHING;

  perms := get_effective_permissions(coordinator_membership_id);

  ASSERT 'event.manage_schedule' = ANY(perms),
    'Effective should include role default event.manage_schedule';
  ASSERT 'vendor.confirm' = ANY(perms),
    'Effective should include explicit override vendor.confirm';

  RAISE NOTICE 'PASS: A2 — Effective permissions combine role defaults + explicit overrides';
END $$;

-- TEST A3: Role change does NOT destroy explicit overrides
DO $$
DECLARE
  coord_membership_id uuid;
  has_explicit boolean;
BEGIN
  SELECT id INTO coord_membership_id
  FROM account_memberships
  WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    AND account_id = '10000000-0000-0000-0000-000000000001';

  UPDATE account_memberships SET account_role = 'viewer' WHERE id = coord_membership_id;

  SELECT EXISTS(
    SELECT 1 FROM account_membership_permissions
    WHERE membership_id = coord_membership_id AND permission_key = 'vendor.confirm'
  ) INTO has_explicit;

  ASSERT has_explicit = true, 'Explicit vendor.confirm should survive role change';

  -- Restore
  UPDATE account_memberships SET account_role = 'event_coordinator' WHERE id = coord_membership_id;

  RAISE NOTICE 'PASS: A3 — Role change preserves explicit permission overrides';
END $$;

-- TEST A4: membership_has_permission checks role defaults + explicit overrides
DO $$
DECLARE
  coord_membership_id uuid;
  owner_membership_id uuid;
  viewer_membership_id uuid;
  result boolean;
BEGIN
  SELECT id INTO coord_membership_id FROM account_memberships
    WHERE profile_id = '00000000-0000-0000-0000-000000000004' AND account_id = '10000000-0000-0000-0000-000000000001';
  SELECT id INTO owner_membership_id FROM account_memberships
    WHERE profile_id = '00000000-0000-0000-0000-000000000003' AND account_id = '10000000-0000-0000-0000-000000000001';
  SELECT id INTO viewer_membership_id FROM account_memberships
    WHERE profile_id = '00000000-0000-0000-0000-000000000005' AND account_id = '10000000-0000-0000-0000-000000000001';

  -- Owner should have event.edit_owned by default
  result := membership_has_permission(owner_membership_id, 'event.edit_owned');
  ASSERT result = true, 'Owner membership should have event.edit_owned (role default)';

  -- Coordinator should have event.manage_schedule by default
  result := membership_has_permission(coord_membership_id, 'event.manage_schedule');
  ASSERT result = true, 'Coordinator membership should have event.manage_schedule (role default)';

  -- Coordinator should have vendor.confirm (explicit override from test A2)
  result := membership_has_permission(coord_membership_id, 'vendor.confirm');
  ASSERT result = true, 'Coordinator membership should have vendor.confirm (explicit override)';

  -- Viewer should NOT have event.edit_owned
  result := membership_has_permission(viewer_membership_id, 'event.edit_owned');
  ASSERT result = false, 'Viewer membership should NOT have event.edit_owned';

  -- Viewer should have event.view_owned (role default)
  result := membership_has_permission(viewer_membership_id, 'event.view_owned');
  ASSERT result = true, 'Viewer membership should have event.view_owned (role default)';

  RAISE NOTICE 'PASS: A4 — membership_has_permission correctly checks defaults + overrides';
END $$;

-- TEST A5: Verify all required helper functions exist
DO $$
BEGIN
  PERFORM 'is_platform_admin'::regproc;
  PERFORM 'is_staff'::regproc;
  PERFORM 'is_account_member'::regproc;
  PERFORM 'has_account_permission'::regproc;
  PERFORM 'membership_has_permission'::regproc;
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
  PERFORM 'is_event_owner_member'::regproc;
  PERFORM 'get_participant_visibility'::regproc;
  PERFORM 'get_default_permissions'::regproc;
  PERFORM 'get_effective_permissions'::regproc;
  PERFORM 'my_events_dashboard'::regproc;
  PERFORM 'event_summary'::regproc;

  RAISE NOTICE 'PASS: A5 — All required helper functions exist';
END $$;

-- TEST A6: Membership removal cascades permissions
DO $$
DECLARE
  temp_membership_id uuid;
  perm_count int;
BEGIN
  INSERT INTO account_memberships (account_id, profile_id, account_role)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'viewer')
  RETURNING id INTO temp_membership_id;

  INSERT INTO account_membership_permissions (membership_id, permission_key)
  VALUES (temp_membership_id, 'vendor.confirm');

  DELETE FROM account_memberships WHERE id = temp_membership_id;

  SELECT count(*) INTO perm_count
  FROM account_membership_permissions WHERE membership_id = temp_membership_id;

  ASSERT perm_count = 0, 'Permissions should be deleted when membership is removed';

  RAISE NOTICE 'PASS: A6 — Membership removal cascades permission deletions';
END $$;

-- TEST A7: Document visibility enum rejects invalid values
DO $$
BEGIN
  BEGIN
    INSERT INTO event_documents (event_id, uploaded_by, name, file_path, visibility)
    VALUES (
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      'Bad Doc', 'events/test/bad.pdf', 'specific_accounts'
    );
    RAISE EXCEPTION 'Should have failed';
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE NOTICE 'PASS: A7 — specific_accounts rejected as invalid document visibility';
  END;
END $$;

-- TEST A8: Contact visibility enum rejects invalid values
DO $$
DECLARE
  contact_id uuid;
BEGIN
  SELECT ecr.contact_id INTO contact_id FROM event_contact_roles ecr LIMIT 1;
  BEGIN
    INSERT INTO event_contact_roles (event_id, contact_id, visibility)
    VALUES ('20000000-0000-0000-0000-000000000001', gen_random_uuid(), 'everyone');
    RAISE EXCEPTION 'Should have failed';
  EXCEPTION WHEN invalid_text_representation OR foreign_key_violation THEN
    RAISE NOTICE 'PASS: A8 — Invalid contact visibility or FK correctly rejected';
  END;
END $$;


-- ============================================================
-- SECTION B: AUTH-CONTEXT TESTS
-- Each test runs in its own transaction block, impersonating a user.
-- We use SET LOCAL so the settings revert after the block.
-- ============================================================

-- TEST B1: Owner user can view, edit, manage schedule for the event (role defaults)
DO $$
DECLARE
  can_view boolean;
  can_edit boolean;
  can_sched boolean;
  can_confirm boolean;
  can_docs boolean;
  can_services boolean;
BEGIN
  -- Impersonate owner user
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;
  SELECT can_edit_event('20000000-0000-0000-0000-000000000001') INTO can_edit;
  SELECT can_manage_schedule('20000000-0000-0000-0000-000000000001') INTO can_sched;
  SELECT can_confirm_vendor('20000000-0000-0000-0000-000000000001') INTO can_confirm;
  SELECT can_manage_documents('20000000-0000-0000-0000-000000000001') INTO can_docs;
  SELECT can_manage_services('20000000-0000-0000-0000-000000000001') INTO can_services;

  ASSERT can_view = true, 'Owner should can_view_event';
  ASSERT can_edit = true, 'Owner should can_edit_event';
  ASSERT can_sched = true, 'Owner should can_manage_schedule';
  ASSERT can_confirm = true, 'Owner should can_confirm_vendor';
  ASSERT can_docs = true, 'Owner should can_manage_documents';
  ASSERT can_services = true, 'Owner should can_manage_services';

  RESET role;
  RAISE NOTICE 'PASS: B1 — Owner user has full event permissions via role defaults';
END $$;

-- TEST B2: Coordinator can view and edit, but NOT confirm vendors (unless explicit override)
DO $$
DECLARE
  can_view boolean;
  can_edit boolean;
  can_confirm boolean;
  can_sched boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;
  SELECT can_edit_event('20000000-0000-0000-0000-000000000001') INTO can_edit;
  SELECT can_manage_schedule('20000000-0000-0000-0000-000000000001') INTO can_sched;

  ASSERT can_view = true, 'Coordinator should can_view_event';
  ASSERT can_edit = true, 'Coordinator should can_edit_event';
  ASSERT can_sched = true, 'Coordinator should can_manage_schedule';

  -- Coordinator has explicit vendor.confirm from test A2, so this should be true
  SELECT can_confirm_vendor('20000000-0000-0000-0000-000000000001') INTO can_confirm;
  ASSERT can_confirm = true, 'Coordinator with explicit vendor.confirm grant should can_confirm_vendor';

  RESET role;
  RAISE NOTICE 'PASS: B2 — Coordinator has correct event permissions (defaults + explicit)';
END $$;

-- TEST B3: Viewer can view event but NOT edit, manage schedule, or confirm vendors
DO $$
DECLARE
  can_view boolean;
  can_edit boolean;
  can_sched boolean;
  can_confirm boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;
  SELECT can_edit_event('20000000-0000-0000-0000-000000000001') INTO can_edit;
  SELECT can_manage_schedule('20000000-0000-0000-0000-000000000001') INTO can_sched;
  SELECT can_confirm_vendor('20000000-0000-0000-0000-000000000001') INTO can_confirm;

  ASSERT can_view = true, 'Viewer should can_view_event';
  ASSERT can_edit = false, 'Viewer should NOT can_edit_event';
  ASSERT can_sched = false, 'Viewer should NOT can_manage_schedule';
  ASSERT can_confirm = false, 'Viewer should NOT can_confirm_vendor';

  RESET role;
  RAISE NOTICE 'PASS: B3 — Viewer has read-only event permissions';
END $$;

-- TEST B4: Participant user can view event (via event.view_participant default)
DO $$
DECLARE
  can_view boolean;
  can_edit boolean;
  is_participant boolean;
  vis text;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;
  SELECT can_edit_event('20000000-0000-0000-0000-000000000001') INTO can_edit;
  SELECT is_event_participant('20000000-0000-0000-0000-000000000001') INTO is_participant;
  SELECT get_participant_visibility('20000000-0000-0000-0000-000000000001') INTO vis;

  ASSERT can_view = true, 'Participant should can_view_event';
  ASSERT can_edit = false, 'Participant should NOT can_edit_event';
  ASSERT is_participant = true, 'Participant user should be identified as participant';
  ASSERT vis = 'limited', 'Participant visibility should be limited';

  RESET role;
  RAISE NOTICE 'PASS: B4 — Participant user has correct view-only access';
END $$;

-- TEST B5: Unrelated user CANNOT view the event
DO $$
DECLARE
  can_view boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000007"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;

  ASSERT can_view = false, 'Unrelated user should NOT can_view_event';

  RESET role;
  RAISE NOTICE 'PASS: B5 — Unrelated user is blocked from viewing event';
END $$;

-- TEST B6: Staff user has access to everything
DO $$
DECLARE
  can_view boolean;
  can_edit boolean;
  can_confirm boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002"}';

  SELECT can_view_event('20000000-0000-0000-0000-000000000001') INTO can_view;
  SELECT can_edit_event('20000000-0000-0000-0000-000000000001') INTO can_edit;
  SELECT can_confirm_vendor('20000000-0000-0000-0000-000000000001') INTO can_confirm;

  ASSERT can_view = true, 'Staff should can_view_event';
  ASSERT can_edit = true, 'Staff should can_edit_event';
  ASSERT can_confirm = true, 'Staff should can_confirm_vendor';

  RESET role;
  RAISE NOTICE 'PASS: B6 — Staff user has full access';
END $$;

-- TEST B7: my_events_dashboard returns events for owner user via role defaults
DO $$
DECLARE
  event_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  SELECT count(*) INTO event_count FROM my_events_dashboard()
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT event_count >= 1, 'Owner user should see event in dashboard (got ' || event_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B7 — my_events_dashboard returns events for owner via role defaults';
END $$;

-- TEST B8: my_events_dashboard returns events for participant user via role defaults
DO $$
DECLARE
  event_count int;
  is_owner boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*), bool_or(is_owner_account)
  INTO event_count, is_owner
  FROM my_events_dashboard()
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT event_count >= 1, 'Participant should see event in dashboard (got ' || event_count || ')';
  ASSERT is_owner = false, 'Participant should see event as non-owner';

  RESET role;
  RAISE NOTICE 'PASS: B8 — my_events_dashboard returns events for participant via role defaults';
END $$;

-- TEST B9: my_events_dashboard returns nothing for unrelated user
DO $$
DECLARE
  event_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000007"}';

  SELECT count(*) INTO event_count FROM my_events_dashboard();

  ASSERT event_count = 0, 'Unrelated user should see 0 events in dashboard (got ' || event_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B9 — my_events_dashboard returns nothing for unrelated user';
END $$;

-- TEST B10: event_summary returns correct data and permissions for owner
DO $$
DECLARE
  rec record;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  SELECT * INTO rec FROM event_summary('20000000-0000-0000-0000-000000000001');

  ASSERT rec.event_id IS NOT NULL, 'Owner should get event_summary result';
  ASSERT rec.can_edit = true, 'Owner can_edit should be true';
  ASSERT rec.can_manage_services = true, 'Owner can_manage_services should be true';
  ASSERT rec.can_manage_docs = true, 'Owner can_manage_docs should be true';
  ASSERT rec.can_confirm_vendors = true, 'Owner can_confirm_vendors should be true';
  ASSERT rec.is_owner = true, 'Owner is_owner should be true';
  ASSERT rec.service_count >= 2, 'Owner should see all services';
  ASSERT rec.schedule_item_count >= 2, 'Owner should see schedule items';

  RESET role;
  RAISE NOTICE 'PASS: B10 — event_summary returns correct data for owner';
END $$;

-- TEST B11: event_summary returns correct restricted permissions for viewer
DO $$
DECLARE
  rec record;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005"}';

  SELECT * INTO rec FROM event_summary('20000000-0000-0000-0000-000000000001');

  ASSERT rec.event_id IS NOT NULL, 'Viewer should get event_summary result';
  ASSERT rec.can_edit = false, 'Viewer can_edit should be false';
  ASSERT rec.can_manage_services = false, 'Viewer can_manage_services should be false';
  ASSERT rec.can_confirm_vendors = false, 'Viewer can_confirm_vendors should be false';
  ASSERT rec.is_owner = true, 'Viewer is still an owner-account member';

  RESET role;
  RAISE NOTICE 'PASS: B11 — event_summary returns restricted permissions for viewer';
END $$;

-- TEST B12: event_summary returns nothing for unrelated user
DO $$
DECLARE
  rec record;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000007"}';

  SELECT * INTO rec FROM event_summary('20000000-0000-0000-0000-000000000001');

  ASSERT rec.event_id IS NULL, 'Unrelated user should get empty event_summary';

  RESET role;
  RAISE NOTICE 'PASS: B12 — event_summary returns nothing for unrelated user';
END $$;

-- TEST B13: Owner can see both owner_only and all_participants documents via RLS
DO $$
DECLARE
  doc_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  SELECT count(*) INTO doc_count FROM event_documents
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT doc_count = 2, 'Owner should see both documents (got ' || doc_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B13 — Owner sees both owner_only and all_participants documents';
END $$;

-- TEST B14: Participant can only see all_participants documents (not owner_only)
DO $$
DECLARE
  doc_count int;
  doc_name text;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO doc_count FROM event_documents
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT doc_count = 1, 'Participant should see only 1 document (got ' || doc_count || ')';

  SELECT name INTO doc_name FROM event_documents
  WHERE event_id = '20000000-0000-0000-0000-000000000001' LIMIT 1;

  ASSERT doc_name = 'Site Map.pdf', 'Participant should only see the all_participants doc';

  RESET role;
  RAISE NOTICE 'PASS: B14 — Participant only sees all_participants documents';
END $$;

-- TEST B15: Owner can see all event contacts (owner_only + all_participants)
DO $$
DECLARE
  contact_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  SELECT count(*) INTO contact_count FROM event_contact_roles
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT contact_count = 2, 'Owner should see both event contacts (got ' || contact_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B15 — Owner sees all event contacts';
END $$;

-- TEST B16: Participant can only see all_participants contacts (not owner_only)
DO $$
DECLARE
  contact_count int;
  role_label text;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO contact_count FROM event_contact_roles
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT contact_count = 1, 'Participant should see only 1 event contact (got ' || contact_count || ')';

  SELECT ecr.role_label INTO role_label FROM event_contact_roles ecr
  WHERE ecr.event_id = '20000000-0000-0000-0000-000000000001' LIMIT 1;

  ASSERT role_label = 'Sound Tech', 'Participant should only see the all_participants contact';

  RESET role;
  RAISE NOTICE 'PASS: B16 — Participant only sees all_participants contacts';
END $$;

-- TEST B17: Limited participant cannot see schedule items (RLS blocks)
DO $$
DECLARE
  item_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO item_count FROM event_schedule_items
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT item_count = 0, 'Limited participant should see 0 schedule items (got ' || item_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B17 — Limited participant cannot see schedule items';
END $$;

-- TEST B18: Limited participant cannot see locations (RLS blocks)
DO $$
DECLARE
  loc_count int;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO loc_count FROM event_locations
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT loc_count = 0, 'Limited participant should see 0 locations (got ' || loc_count || ')';

  RESET role;
  RAISE NOTICE 'PASS: B18 — Limited participant cannot see locations';
END $$;

-- TEST B19: Limited participant can only see services for their own account
DO $$
DECLARE
  svc_count int;
  svc_name text;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO svc_count FROM event_services
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  -- Should see PA System (linked to vendor account) but NOT Catering (no account link)
  ASSERT svc_count = 1, 'Limited participant should see 1 service (got ' || svc_count || ')';

  SELECT name INTO svc_name FROM event_services
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT svc_name = 'PA System', 'Limited participant should only see their own service';

  RESET role;
  RAISE NOTICE 'PASS: B19 — Limited participant only sees own-account services';
END $$;

-- TEST B20: Standard participant can see all services, schedule, locations
DO $$
DECLARE
  svc_count int;
  item_count int;
  loc_count int;
BEGIN
  -- Upgrade participant to standard visibility
  UPDATE event_accounts SET visibility = 'standard'
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000006"}';

  SELECT count(*) INTO svc_count FROM event_services
  WHERE event_id = '20000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO item_count FROM event_schedule_items
  WHERE event_id = '20000000-0000-0000-0000-000000000001';
  SELECT count(*) INTO loc_count FROM event_locations
  WHERE event_id = '20000000-0000-0000-0000-000000000001';

  ASSERT svc_count = 2, 'Standard participant should see all services (got ' || svc_count || ')';
  ASSERT item_count = 2, 'Standard participant should see schedule items (got ' || item_count || ')';
  ASSERT loc_count = 1, 'Standard participant should see locations (got ' || loc_count || ')';

  RESET role;

  -- Reset to limited
  UPDATE event_accounts SET visibility = 'limited'
  WHERE event_id = '20000000-0000-0000-0000-000000000001'
    AND account_id = '10000000-0000-0000-0000-000000000002';

  RAISE NOTICE 'PASS: B20 — Standard participant sees all participant-shared sections';
END $$;

-- TEST B21: has_account_permission works with computed defaults (not just explicit rows)
DO $$
DECLARE
  result boolean;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';

  -- Owner should have event.edit_owned via role default (no explicit row)
  SELECT has_account_permission('10000000-0000-0000-0000-000000000001', 'event.edit_owned') INTO result;
  ASSERT result = true, 'has_account_permission should find event.edit_owned via role default';

  -- Owner should have account.manage_members via role default
  SELECT has_account_permission('10000000-0000-0000-0000-000000000001', 'account.manage_members') INTO result;
  ASSERT result = true, 'has_account_permission should find account.manage_members via role default';

  RESET role;
  RAISE NOTICE 'PASS: B21 — has_account_permission works with computed role defaults';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DO $$
BEGIN
  -- Clean up explicit override from test A2/A3
  DELETE FROM account_membership_permissions
  WHERE permission_key = 'vendor.confirm'
    AND membership_id IN (
      SELECT id FROM account_memberships
      WHERE profile_id = '00000000-0000-0000-0000-000000000004'
    );

  RAISE NOTICE '====================================';
  RAISE NOTICE 'All permission integration tests passed.';
  RAISE NOTICE '====================================';
END $$;
