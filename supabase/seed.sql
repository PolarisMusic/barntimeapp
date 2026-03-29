-- =============================================================================
-- Barn Time Portal — Dev Seed Data
-- =============================================================================
--
-- This script creates a complete test dataset for local development.
-- After running `supabase db reset`, six test users are ready to use
-- with magic-link sign-in via Inbucket (http://localhost:54324).
--
-- Test accounts:
--
--   admin@barntime.net            — Staff (platform admin access)
--   owner@sunsetweddings.com      — Account Owner (Sunset Weddings)
--   coordinator@sunsetweddings.com — Event Coordinator (Sunset Weddings)
--   viewer@sunsetweddings.com     — Viewer (Sunset Weddings)
--   vendor@bayareasound.com       — Participant Owner (Bay Area Sound, standard)
--   venuemanager@redwoodestate.com — Participant Owner (Redwood Estate, limited)
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- AUTH USERS (deterministic UUIDs for local dev)
-- -------------------------------------------------------------------------
-- These insert directly into Supabase auth tables so the users exist
-- immediately after reset. Sign in via magic link through Inbucket.

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, is_super_admin
) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@barntime.net', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', '', false),
  ('aaaaaaaa-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@sunsetweddings.com', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Jordan Sunset"}', '', false),
  ('aaaaaaaa-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'coordinator@sunsetweddings.com', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Casey Coordinator"}', '', false),
  ('aaaaaaaa-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@sunsetweddings.com', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Dana Viewer"}', '', false),
  ('aaaaaaaa-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'vendor@bayareasound.com', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Turner"}', '', false),
  ('aaaaaaaa-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'venuemanager@redwoodestate.com', '', now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Maria Chen"}', '', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'admin@barntime.net', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"admin@barntime.net"}', now(), now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'owner@sunsetweddings.com', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"owner@sunsetweddings.com"}', now(), now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'coordinator@sunsetweddings.com', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","email":"coordinator@sunsetweddings.com"}', now(), now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 'viewer@sunsetweddings.com', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","email":"viewer@sunsetweddings.com"}', now(), now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000005', 'vendor@bayareasound.com', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","email":"vendor@bayareasound.com"}', now(), now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000006', 'venuemanager@redwoodestate.com', 'email',
   '{"sub":"aaaaaaaa-0000-0000-0000-000000000006","email":"venuemanager@redwoodestate.com"}', now(), now(), now())
ON CONFLICT (id, provider) DO NOTHING;

-- -------------------------------------------------------------------------
-- PROFILES (auto-created by trigger, but we upsert to set platform_role)
-- -------------------------------------------------------------------------
INSERT INTO profiles (id, email, full_name, platform_role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@barntime.net',              'Admin User',        'staff'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'owner@sunsetweddings.com',        'Jordan Sunset',     'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'coordinator@sunsetweddings.com',  'Casey Coordinator', 'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'viewer@sunsetweddings.com',       'Dana Viewer',       'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'vendor@bayareasound.com',         'Alex Turner',       'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'venuemanager@redwoodestate.com',  'Maria Chen',        'standard')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  platform_role = EXCLUDED.platform_role;

-- -------------------------------------------------------------------------
-- ACCOUNTS
-- -------------------------------------------------------------------------
INSERT INTO accounts (id, name, type, status) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'Barn Time Productions',  'internal', 'active'),
  ('cccccccc-0000-0000-0000-000000000002', 'Sunset Weddings LLC',    'client',   'active'),
  ('cccccccc-0000-0000-0000-000000000003', 'Bay Area Sound Co',      'vendor',   'active'),
  ('cccccccc-0000-0000-0000-000000000004', 'Redwood Estate Venue',   'venue',    'active'),
  ('cccccccc-0000-0000-0000-000000000005', 'Napa Valley Florals',    'vendor',   'active'),
  ('cccccccc-0000-0000-0000-000000000006', 'Pacific Photo Studios',  'vendor',   'active')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- ACCOUNT MEMBERSHIPS (the role matrix)
-- -------------------------------------------------------------------------
INSERT INTO account_memberships (account_id, profile_id, account_role) VALUES
  -- Admin is member of Barn Time internal account
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'account_owner'),
  -- Owner account: Sunset Weddings has owner, coordinator, and viewer
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'account_owner'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'event_coordinator'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'viewer'),
  -- Vendor: Bay Area Sound
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005', 'account_owner'),
  -- Venue: Redwood Estate
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000006', 'account_owner')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- ACCOUNT CONTACTS (directory-level contacts)
-- -------------------------------------------------------------------------
INSERT INTO account_contacts (id, account_id, name, email, phone, role_label) VALUES
  -- Sunset Weddings contacts
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 'Sarah Johnson', 'sarah@example.com',       '555-0101', 'Bride'),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000002', 'Mike Smith',    'mike@example.com',        '555-0102', 'Groom'),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 'Linda Johnson', 'linda@example.com',       '555-0103', 'Mother of the Bride'),
  -- Bay Area Sound contacts
  ('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000003', 'Alex Turner',   'alex@bayareasound.com',   '555-0201', 'Lead Technician'),
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', 'Jamie Rivera',  'jamie@bayareasound.com',  '555-0202', 'Assistant'),
  -- Redwood Estate contacts
  ('dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000004', 'Maria Chen',    'maria@redwoodestate.com', '555-0301', 'Venue Manager'),
  ('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000004', 'Tom Park',      'tom@redwoodestate.com',   '555-0302', 'Groundskeeper')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- LINKABLE ACCOUNTS ALLOWLIST
-- -------------------------------------------------------------------------
INSERT INTO account_linkable_accounts (owner_account_id, linkable_account_id) VALUES
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003'),  -- Bay Area Sound
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000004'),  -- Redwood Estate
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000005'),  -- Napa Valley Florals
  ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000006')   -- Pacific Photo Studios
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- EVENT
-- -------------------------------------------------------------------------
INSERT INTO events (id, owner_account_id, name, status, start_date, end_date, description, timezone) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002',
   'Johnson-Smith Wedding',
   'active',
   '2026-06-15',
   '2026-06-15',
   'Outdoor wedding ceremony and reception at Redwood Estate. 150 guests expected. Ceremony on the lawn, cocktail hour on the terrace, reception in the main hall.',
   'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- PARTICIPANTS (vendor = standard, venue = limited)
-- -------------------------------------------------------------------------
INSERT INTO event_accounts (event_id, account_id, role_label, visibility) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Sound Provider', 'standard'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', 'Venue',          'limited')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- LOCATIONS
-- -------------------------------------------------------------------------
INSERT INTO event_locations (id, event_id, name, address, location_type, map_url, notes) VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'Ceremony Lawn', '123 Redwood Rd, Mill Valley CA 94941', 'ceremony',
   'https://maps.google.com/?q=123+Redwood+Rd+Mill+Valley+CA', 'Enter from the south gate. Parking lot B is closest.'),
  ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001',
   'Reception Hall', '123 Redwood Rd, Mill Valley CA 94941', 'reception',
   'https://maps.google.com/?q=123+Redwood+Rd+Mill+Valley+CA', 'Indoor/outdoor space, capacity 200. A/V booth in the back left corner.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- SERVICES
-- -------------------------------------------------------------------------
INSERT INTO event_services (event_id, account_id, name, description, status) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
   'Sound System', 'Full PA system for ceremony and reception. Includes wireless mics, monitors, and DJ setup.', 'pending'),
  ('eeeeeeee-0000-0000-0000-000000000001', NULL,
   'Catering', 'Full-service dinner for 150 guests. Plated service with 3 entree options.', 'confirmed'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005',
   'Floral Arrangements', 'Ceremony arch, 15 table centerpieces, bridal bouquet, boutonnieres.', 'pending'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'Photography', 'Full day coverage: ceremony, portraits, reception. Two photographers.', 'confirmed')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- SCHEDULE
-- -------------------------------------------------------------------------
INSERT INTO event_schedule_items (event_id, title, start_time, end_time, location_id, description, sort_order) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'Vendor Load-in',
   '2026-06-15 08:00:00-07', '2026-06-15 11:00:00-07',
   'ffffffff-0000-0000-0000-000000000002', 'All vendors arrive and set up. Use loading dock entrance.', 1),
  ('eeeeeeee-0000-0000-0000-000000000001', 'Sound Check',
   '2026-06-15 11:00:00-07', '2026-06-15 12:00:00-07',
   'ffffffff-0000-0000-0000-000000000001', 'Sound system test at ceremony site.', 2),
  ('eeeeeeee-0000-0000-0000-000000000001', 'Ceremony Rehearsal Walk-through',
   '2026-06-15 13:00:00-07', '2026-06-15 14:00:00-07',
   'ffffffff-0000-0000-0000-000000000001', 'Quick walk-through with officiant and wedding party.', 3),
  ('eeeeeeee-0000-0000-0000-000000000001', 'Ceremony',
   '2026-06-15 16:00:00-07', '2026-06-15 16:45:00-07',
   'ffffffff-0000-0000-0000-000000000001', 'Outdoor ceremony on the lawn. Guests seated by 3:45 PM.', 4),
  ('eeeeeeee-0000-0000-0000-000000000001', 'Cocktail Hour',
   '2026-06-15 17:00:00-07', '2026-06-15 18:00:00-07',
   NULL, 'Drinks and appetizers on the terrace while hall is flipped.', 5),
  ('eeeeeeee-0000-0000-0000-000000000001', 'Reception',
   '2026-06-15 18:00:00-07', '2026-06-15 23:00:00-07',
   'ffffffff-0000-0000-0000-000000000002', 'Dinner, toasts, first dance, open dance floor. Last call at 10:30 PM.', 6)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- EVENT CONTACTS (assigned from account directories)
-- -------------------------------------------------------------------------
INSERT INTO event_contact_roles (event_id, contact_id, role_label, visibility, sort_order) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Bride',           'all_participants', 1),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Groom',           'all_participants', 2),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 'Family Contact',  'owner_only',       3),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', 'Sound Lead',      'all_participants', 4),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000006', 'Venue Manager',   'all_participants', 5),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000007', 'Groundskeeper',   'owner_only',       6)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- ACTIVITY LOG (structured details matching the runtime formatter)
-- -------------------------------------------------------------------------
-- Timestamps are spread over several days to produce realistic grouping
-- in the Updates tab. All details use the same JSON shape that
-- logActivity() and formatActivity() use at runtime.

INSERT INTO activity_log (actor_id, entity_type, entity_id, action, summary, details, created_at) VALUES

  -- Day 1: Event creation and initial setup (8 days ago)
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'event.created',
   'Created event "Johnson-Smith Wedding"',
   '{"subject_type":"event","subject_name":"Johnson-Smith Wedding"}',
   now() - interval '8 days' + interval '9 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'participant.linked',
   'Linked Bay Area Sound Co as Sound Provider',
   '{"subject_type":"account","subject_name":"Bay Area Sound Co","role_label":"Sound Provider","visibility_scope":"standard"}',
   now() - interval '8 days' + interval '9 hours 15 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'participant.linked',
   'Linked Redwood Estate Venue as Venue',
   '{"subject_type":"account","subject_name":"Redwood Estate Venue","role_label":"Venue","visibility_scope":"limited"}',
   now() - interval '8 days' + interval '9 hours 20 minutes'),

  -- Day 2: Services added (6 days ago)
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'service.created',
   'Added service "Sound System"',
   '{"subject_type":"service","subject_name":"Sound System"}',
   now() - interval '6 days' + interval '10 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'service.created',
   'Added service "Catering"',
   '{"subject_type":"service","subject_name":"Catering"}',
   now() - interval '6 days' + interval '10 hours 10 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'service.created',
   'Added service "Floral Arrangements"',
   '{"subject_type":"service","subject_name":"Floral Arrangements"}',
   now() - interval '6 days' + interval '10 hours 25 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'service.created',
   'Added service "Photography"',
   '{"subject_type":"service","subject_name":"Photography"}',
   now() - interval '6 days' + interval '10 hours 30 minutes'),

  -- Day 3: Schedule built out (4 days ago)
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_created',
   'Added "Vendor Load-in" to schedule',
   '{"subject_type":"schedule_item","subject_name":"Vendor Load-in"}',
   now() - interval '4 days' + interval '11 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_created',
   'Added "Sound Check" to schedule',
   '{"subject_type":"schedule_item","subject_name":"Sound Check"}',
   now() - interval '4 days' + interval '11 hours 5 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_created',
   'Added "Ceremony" to schedule',
   '{"subject_type":"schedule_item","subject_name":"Ceremony"}',
   now() - interval '4 days' + interval '11 hours 10 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_created',
   'Added "Cocktail Hour" to schedule',
   '{"subject_type":"schedule_item","subject_name":"Cocktail Hour"}',
   now() - interval '4 days' + interval '11 hours 15 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_created',
   'Added "Reception" to schedule',
   '{"subject_type":"schedule_item","subject_name":"Reception"}',
   now() - interval '4 days' + interval '11 hours 20 minutes'),

  -- Day 4: Contacts assigned and vendor confirmed (2 days ago)
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.assigned',
   'Assigned Sarah Johnson as Bride',
   '{"subject_type":"contact","subject_name":"Sarah Johnson","role_label":"Bride","visibility_scope":"all_participants"}',
   now() - interval '2 days' + interval '9 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.assigned',
   'Assigned Mike Smith as Groom',
   '{"subject_type":"contact","subject_name":"Mike Smith","role_label":"Groom","visibility_scope":"all_participants"}',
   now() - interval '2 days' + interval '9 hours 5 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.assigned',
   'Assigned Linda Johnson as Family Contact',
   '{"subject_type":"contact","subject_name":"Linda Johnson","role_label":"Family Contact","visibility_scope":"owner_only"}',
   now() - interval '2 days' + interval '9 hours 10 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.assigned',
   'Assigned Alex Turner as Sound Lead',
   '{"subject_type":"contact","subject_name":"Alex Turner","role_label":"Sound Lead","visibility_scope":"all_participants"}',
   now() - interval '2 days' + interval '9 hours 15 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.assigned',
   'Assigned Maria Chen as Venue Manager',
   '{"subject_type":"contact","subject_name":"Maria Chen","role_label":"Venue Manager","visibility_scope":"all_participants"}',
   now() - interval '2 days' + interval '9 hours 20 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'vendor.confirmed',
   'Confirmed the vendor for "Catering"',
   '{"subject_type":"service","subject_name":"Catering"}',
   now() - interval '2 days' + interval '14 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'vendor.confirmed',
   'Confirmed the vendor for "Photography"',
   '{"subject_type":"service","subject_name":"Photography"}',
   now() - interval '2 days' + interval '14 hours 10 minutes'),

  -- Day 5: Owner updates and participant adjustments (yesterday)
  ('aaaaaaaa-0000-0000-0000-000000000002', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'event.updated',
   'Updated event details for "Johnson-Smith Wedding"',
   '{"subject_type":"event","subject_name":"Johnson-Smith Wedding","field_names":["description"]}',
   now() - interval '1 day' + interval '10 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000002', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'service.updated',
   'Updated service "Sound System"',
   '{"subject_type":"service","subject_name":"Sound System","field_names":["description"]}',
   now() - interval '1 day' + interval '10 hours 30 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000002', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'participant.updated',
   'Changed Redwood Estate Venue visibility to limited',
   '{"subject_type":"account","subject_name":"Redwood Estate Venue","field_names":["visibility"],"visibility_scope":"limited"}',
   now() - interval '1 day' + interval '11 hours'),

  ('aaaaaaaa-0000-0000-0000-000000000002', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'contact.role_updated',
   'Updated Tom Park''s visibility to owner only',
   '{"subject_type":"contact","subject_name":"Tom Park","field_names":["visibility"],"visibility_scope":"owner_only"}',
   now() - interval '1 day' + interval '11 hours 15 minutes'),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001',
   'schedule.item_updated',
   'Updated "Ceremony" on the schedule',
   '{"subject_type":"schedule_item","subject_name":"Ceremony","field_names":["description","start_time"]}',
   now() - interval '1 day' + interval '15 hours');

-- ---------------------------------------------------------------------------
-- TEST ACCOUNTS REFERENCE
-- ---------------------------------------------------------------------------
--
-- admin@barntime.net (Staff)
--   - Full admin access at /admin
--   - Can manage all accounts, events, services, etc.
--   - Portal shows all events (staff bypass)
--
-- owner@sunsetweddings.com (Account Owner — Sunset Weddings)
--   - Portal: sees Johnson-Smith Wedding with full owner access
--   - Can edit schedule notes, service notes, confirm vendors
--   - Can manage contacts, documents, participants
--   - Updates tab: sees all activity
--
-- coordinator@sunsetweddings.com (Event Coordinator — Sunset Weddings)
--   - Portal: sees Johnson-Smith Wedding with coordinator access
--   - Can edit schedule notes, service notes
--   - Can manage contacts, documents
--   - CANNOT confirm vendors or manage participants
--
-- viewer@sunsetweddings.com (Viewer — Sunset Weddings)
--   - Portal: sees Johnson-Smith Wedding, read-only
--   - Can view all sections (owner-account member)
--
-- vendor@bayareasound.com (Standard Participant — Bay Area Sound)
--   - Portal: sees Johnson-Smith Wedding as standard participant
--   - Can see schedule, locations, all services
--   - CANNOT see owner_only contacts or documents
--
-- venuemanager@redwoodestate.com (Limited Participant — Redwood Estate)
--   - Portal: sees Johnson-Smith Wedding as limited participant
--   - CANNOT see schedule or locations tabs
--   - Can see only own-account services
--   - Updates tab: sees only event-level activity
--
