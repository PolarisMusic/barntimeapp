-- =============================================================================
-- Barn Time Portal — Dev Seed Data
-- =============================================================================
--
-- This script creates a complete test dataset for development and pilot testing.
-- It covers the full role matrix: staff, owner-account users (owner, coordinator,
-- viewer), and participant-account users (standard, limited).
--
-- SETUP INSTRUCTIONS:
--
-- 1. Create 6 auth users in Supabase (Dashboard > Authentication > Users > Add User)
--    Use "Auto Confirm" or email+password. Create them with these emails:
--
--      admin@barntime.net
--      owner@sunsetweddings.com
--      coordinator@sunsetweddings.com
--      viewer@sunsetweddings.com
--      vendor@bayareasound.com
--      venuemanager@redwoodestate.com
--
-- 2. After creating the users, get their UUIDs from the Supabase auth.users table:
--
--      SELECT id, email FROM auth.users ORDER BY email;
--
-- 3. Replace the 6 placeholder UUIDs below with the real auth.users UUIDs:
--
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000001'  REPLACE: admin UUID
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000002'  REPLACE: owner UUID
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000003'  REPLACE: coordinator UUID
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000004'  REPLACE: viewer UUID
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000005'  REPLACE: vendor UUID
--      FIND:    'aaaaaaaa-0000-0000-0000-000000000006'  REPLACE: venuemanager UUID
--
-- 4. Run this script in the Supabase SQL Editor.
--
-- 5. You can now log in as any of the 6 users to test all role paths.
--
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES (must match auth.users UUIDs — replace placeholders!)
-- ---------------------------------------------------------------------------
-- Note: The on_auth_user_created trigger normally creates profiles automatically.
-- If profiles already exist from trigger, this will upsert them.

INSERT INTO profiles (id, email, full_name, platform_role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@barntime.net',            'Admin User',        'staff'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'owner@sunsetweddings.com',      'Jordan Sunset',     'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'coordinator@sunsetweddings.com', 'Casey Coordinator', 'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'viewer@sunsetweddings.com',      'Dana Viewer',       'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'vendor@bayareasound.com',        'Alex Turner',       'standard'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'venuemanager@redwoodestate.com', 'Maria Chen',        'standard')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  platform_role = EXCLUDED.platform_role;

-- ---------------------------------------------------------------------------
-- ACCOUNTS
-- ---------------------------------------------------------------------------
INSERT INTO accounts (id, name, type, status) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'Barn Time Productions',  'internal', 'active'),
  ('cccccccc-0000-0000-0000-000000000002', 'Sunset Weddings LLC',    'client',   'active'),
  ('cccccccc-0000-0000-0000-000000000003', 'Bay Area Sound Co',      'vendor',   'active'),
  ('cccccccc-0000-0000-0000-000000000004', 'Redwood Estate Venue',   'venue',    'active'),
  ('cccccccc-0000-0000-0000-000000000005', 'Napa Valley Florals',    'vendor',   'active'),
  ('cccccccc-0000-0000-0000-000000000006', 'Pacific Photo Studios',  'vendor',   'active');

-- ---------------------------------------------------------------------------
-- ACCOUNT MEMBERSHIPS (the role matrix)
-- ---------------------------------------------------------------------------
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
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000006', 'account_owner');

-- ---------------------------------------------------------------------------
-- ACCOUNT CONTACTS (directory-level contacts)
-- ---------------------------------------------------------------------------
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
  ('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000004', 'Tom Park',      'tom@redwoodestate.com',   '555-0302', 'Groundskeeper');

-- ---------------------------------------------------------------------------
-- EVENT
-- ---------------------------------------------------------------------------
INSERT INTO events (id, owner_account_id, name, status, start_date, end_date, description, timezone) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002',
   'Johnson-Smith Wedding',
   'active',
   '2026-06-15',
   '2026-06-15',
   'Outdoor wedding ceremony and reception at Redwood Estate. 150 guests expected. Ceremony on the lawn, cocktail hour on the terrace, reception in the main hall.',
   'America/Los_Angeles');

-- ---------------------------------------------------------------------------
-- PARTICIPANTS (vendor = standard, venue = limited)
-- ---------------------------------------------------------------------------
INSERT INTO event_accounts (event_id, account_id, role_label, visibility) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Sound Provider', 'standard'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', 'Venue',          'limited');

-- ---------------------------------------------------------------------------
-- LOCATIONS
-- ---------------------------------------------------------------------------
INSERT INTO event_locations (id, event_id, name, address, location_type, map_url, notes) VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
   'Ceremony Lawn', '123 Redwood Rd, Mill Valley CA 94941', 'ceremony',
   'https://maps.google.com/?q=123+Redwood+Rd+Mill+Valley+CA', 'Enter from the south gate. Parking lot B is closest.'),
  ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001',
   'Reception Hall', '123 Redwood Rd, Mill Valley CA 94941', 'reception',
   'https://maps.google.com/?q=123+Redwood+Rd+Mill+Valley+CA', 'Indoor/outdoor space, capacity 200. A/V booth in the back left corner.');

-- ---------------------------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------------------------
INSERT INTO event_services (event_id, account_id, name, description, status) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
   'Sound System', 'Full PA system for ceremony and reception. Includes wireless mics, monitors, and DJ setup.', 'pending'),
  ('eeeeeeee-0000-0000-0000-000000000001', NULL,
   'Catering', 'Full-service dinner for 150 guests. Plated service with 3 entree options.', 'confirmed'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005',
   'Floral Arrangements', 'Ceremony arch, 15 table centerpieces, bridal bouquet, boutonnieres.', 'pending'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'Photography', 'Full day coverage: ceremony, portraits, reception. Two photographers.', 'confirmed');

-- ---------------------------------------------------------------------------
-- SCHEDULE
-- ---------------------------------------------------------------------------
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
   'ffffffff-0000-0000-0000-000000000002', 'Dinner, toasts, first dance, open dance floor. Last call at 10:30 PM.', 6);

-- ---------------------------------------------------------------------------
-- EVENT CONTACTS (assigned from account directories)
-- ---------------------------------------------------------------------------
INSERT INTO event_contact_roles (event_id, contact_id, role_label, visibility, sort_order) VALUES
  -- Owner contacts (visible to all or owner-only)
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Bride',           'all_participants', 1),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Groom',           'all_participants', 2),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 'Family Contact',   'owner_only',       3),
  -- Vendor contacts
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', 'Sound Lead',      'all_participants', 4),
  -- Venue contacts
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000006', 'Venue Manager',   'all_participants', 5),
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000007', 'Groundskeeper',   'owner_only',       6);

-- ---------------------------------------------------------------------------
-- ACTIVITY LOG (seed some realistic history)
-- ---------------------------------------------------------------------------
INSERT INTO activity_log (actor_id, entity_type, entity_id, action, summary) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'event.created',         'Created event "Johnson-Smith Wedding"'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'participant.linked',     'Linked Bay Area Sound Co as Sound Provider'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'participant.linked',     'Linked Redwood Estate Venue as Venue'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'service.created',        'Added service "Sound System"'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'service.created',        'Added service "Catering"'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'schedule.item_created',  'Added "Ceremony" to schedule'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'contact.assigned',       'Assigned Sarah Johnson as Bride'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'event', 'eeeeeeee-0000-0000-0000-000000000001', 'event.updated',          'Updated event description');

-- ---------------------------------------------------------------------------
-- WHAT TO TEST WITH EACH USER
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
--   - Can manage contacts (assign/remove/edit visibility)
--   - Can manage documents (upload/edit/delete)
--   - Can manage participants (add/remove/edit visibility)
--   - Updates tab: sees all activity
--
-- coordinator@sunsetweddings.com (Event Coordinator — Sunset Weddings)
--   - Portal: sees Johnson-Smith Wedding with coordinator access
--   - Can edit schedule notes, service notes
--   - Can manage contacts, documents
--   - CANNOT confirm vendors (requires account_manager+)
--   - CANNOT manage participants (requires account_owner/manager)
--
-- viewer@sunsetweddings.com (Viewer — Sunset Weddings)
--   - Portal: sees Johnson-Smith Wedding, read-only
--   - Can view all sections (owner-account member)
--   - CANNOT edit anything
--   - Updates tab: sees all activity (owner-account member)
--
-- vendor@bayareasound.com (Standard Participant — Bay Area Sound)
--   - Portal: sees Johnson-Smith Wedding as standard participant
--   - Can see schedule, locations, all services
--   - Can see all_participants contacts and documents
--   - CANNOT see owner_only contacts or documents
--   - CANNOT edit anything
--   - Updates tab: sees event, schedule, location, service activity
--
-- venuemanager@redwoodestate.com (Limited Participant — Redwood Estate)
--   - Portal: sees Johnson-Smith Wedding as limited participant
--   - CANNOT see schedule tab or locations tab (hidden + route-guarded)
--   - Can see only own-account services (if any)
--   - Can see all_participants contacts and documents
--   - Updates tab: sees only event-level activity
--
