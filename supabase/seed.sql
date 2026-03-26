-- =============================================================================
-- Barn Time Portal — Seed Data
-- =============================================================================
-- This seed script is designed to run AFTER the migration and AFTER
-- auth users are created through Supabase Auth (magic link or admin invite).
-- It provides example data for development and testing.
--
-- To use this seed data:
-- 1. Create auth users through Supabase Dashboard or Auth API
-- 2. Run this script, replacing the UUIDs below with actual auth.users IDs
-- =============================================================================

-- Note: In production, profiles are auto-created by the on_auth_user_created trigger.
-- For seed data, create profiles directly (the trigger won't fire for direct inserts).

-- Example: Create a platform admin profile
-- Replace 'ADMIN_USER_UUID' with the actual auth user UUID after creating the user.
--
-- INSERT INTO profiles (id, email, full_name, platform_role) VALUES
--   ('ADMIN_USER_UUID', 'admin@barntime.net', 'Admin User', 'platform_admin');

-- Example: Create accounts
-- INSERT INTO accounts (id, name, type, status) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'Barn Time Productions', 'internal', 'active'),
--   ('22222222-2222-2222-2222-222222222222', 'Sunset Weddings LLC', 'client', 'active'),
--   ('33333333-3333-3333-3333-333333333333', 'Bay Area Sound Co', 'vendor', 'active'),
--   ('44444444-4444-4444-4444-444444444444', 'Redwood Estate Venue', 'venue', 'active');

-- Example: Link members to accounts
-- INSERT INTO account_memberships (account_id, profile_id, account_role) VALUES
--   ('22222222-2222-2222-2222-222222222222', 'CLIENT_OWNER_UUID', 'account_owner'),
--   ('22222222-2222-2222-2222-222222222222', 'CLIENT_COORDINATOR_UUID', 'event_coordinator'),
--   ('33333333-3333-3333-3333-333333333333', 'VENDOR_USER_UUID', 'account_owner');

-- Example: Create an event owned by the client account
-- INSERT INTO events (id, owner_account_id, name, status, start_date, end_date, description) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
--    '22222222-2222-2222-2222-222222222222',
--    'Johnson-Smith Wedding',
--    'active',
--    '2026-06-15',
--    '2026-06-15',
--    'Outdoor wedding ceremony and reception at Redwood Estate');

-- Example: Link participant accounts (vendor, venue) to the event
-- INSERT INTO event_accounts (event_id, account_id, role_label) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Sound Provider'),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 'Venue');

-- Example: Add locations
-- INSERT INTO event_locations (event_id, name, address, notes) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Ceremony Lawn', '123 Redwood Rd, Mill Valley CA', 'Enter from the south gate'),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Reception Hall', '123 Redwood Rd, Mill Valley CA', 'Indoor/outdoor space');

-- Example: Add services
-- INSERT INTO event_services (event_id, account_id, name, description, status) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Sound System', 'Full PA system for ceremony and reception', 'pending'),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, 'Catering', 'Full-service dinner for 150 guests', 'confirmed');

-- Example: Add schedule items
-- INSERT INTO event_schedule_items (event_id, title, start_time, end_time, description, sort_order) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vendor Load-in', '2026-06-15 08:00:00-07', '2026-06-15 11:00:00-07', 'All vendors arrive and set up', 1),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Ceremony', '2026-06-15 16:00:00-07', '2026-06-15 16:45:00-07', 'Outdoor ceremony on the lawn', 2),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Cocktail Hour', '2026-06-15 17:00:00-07', '2026-06-15 18:00:00-07', 'Drinks and appetizers', 3),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Reception', '2026-06-15 18:00:00-07', '2026-06-15 23:00:00-07', 'Dinner, toasts, and dancing', 4);

-- Example: Add contacts
-- INSERT INTO account_contacts (account_id, name, email, phone, role_label) VALUES
--   ('22222222-2222-2222-2222-222222222222', 'Sarah Johnson', 'sarah@example.com', '555-0101', 'Bride'),
--   ('22222222-2222-2222-2222-222222222222', 'Mike Smith', 'mike@example.com', '555-0102', 'Groom'),
--   ('33333333-3333-3333-3333-333333333333', 'Alex Turner', 'alex@bayareasound.com', '555-0201', 'Lead Tech'),
--   ('44444444-4444-4444-4444-444444444444', 'Maria Chen', 'maria@redwoodestate.com', '555-0301', 'Venue Manager');
