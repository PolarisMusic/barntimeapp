# Barn Time Portal

Event production management portal for Barn Time, hosted at `portal.barntime.net`.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (Postgres + Auth + Storage)
- **Auth**: Email magic link via Supabase Auth
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Permissions**: Database-centered (RLS + SQL helper functions)

## Project Structure

```
src/
├── app/
│   ├── auth/                    # Auth routes (login, callback, confirm, signout)
│   ├── admin/                   # Admin portal (staff/platform_admin only)
│   │   ├── accounts/            # Account CRUD, members, contacts
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   │       ├── members/
│   │   │       └── contacts/
│   │   └── events/              # Event CRUD with section-based editor
│   │       ├── new/
│   │       └── [id]/
│   │           ├── participants/
│   │           ├── services/
│   │           ├── schedule/
│   │           ├── locations/
│   │           └── documents/
│   └── portal/                  # Client-facing portal
│       └── events/
│           └── [id]/
│               ├── schedule/
│               ├── services/
│               ├── contacts/
│               └── documents/
├── components/
│   ├── ui/                      # Shared UI components
│   ├── admin/                   # Admin-specific components
│   └── portal/                  # Portal-specific components
├── lib/
│   ├── supabase/                # Supabase client utilities
│   │   ├── server.ts            # Server-side client (cookie-based + service role)
│   │   ├── client.ts            # Browser client
│   │   └── middleware.ts        # Session refresh middleware
│   ├── auth.ts                  # Auth helpers (requireUser, requireAdmin, etc.)
│   └── actions/                 # Server Actions (all write operations)
│       ├── accounts.ts
│       ├── events.ts
│       ├── contacts.ts
│       ├── documents.ts
│       └── activity-log.ts
├── types/
│   └── database.ts              # TypeScript types for database tables
└── middleware.ts                 # Next.js middleware (auth redirect)

supabase/
├── migrations/
│   └── 00001_initial_schema.sql # Full schema: tables, enums, RLS, helpers, views
├── seed.sql                     # Example seed data template
└── tests/
    └── permission_tests.sql     # Permission helper integration tests
```

## Architecture

### Core Primitives

| Primitive | Purpose |
|-----------|---------|
| `profiles` | Login identity (1:1 with auth.users) |
| `accounts` | Business/entity (client, vendor, venue, internal) |
| `account_memberships` | Links profiles to accounts with a role |
| `account_membership_permissions` | Fine-grained permission grants per membership |
| `account_contacts` | Operational contacts (not necessarily logins) |
| `events` | Production/event record |
| `event_accounts` | Participant accounts linked to an event |
| `event_locations` | Locations for an event |
| `event_services` | Services/vendors for an event |
| `event_schedule_items` | Timeline items for an event |
| `event_documents` | Files attached to an event |
| `activity_log` | Audit trail for all mutations |

### Permission Model (3 Layers)

**1. Platform Role** (in `profiles`):
- `platform_admin` — full system access
- `staff` — full system access (operational)
- `standard` — access only through account memberships

**2. Account Role** (in `account_memberships`):
- `account_owner` — all permissions within the account
- `account_manager` — most permissions, including vendor confirmation
- `event_coordinator` — event management, no member management
- `viewer` — read-only access

**3. Permission Grants** (in `account_membership_permissions`):
| Key | Purpose |
|-----|---------|
| `account.manage_members` | Add/remove account members |
| `account.manage_contacts` | Manage account contacts |
| `event.create` | Create events for the account |
| `event.view_owned` | View events owned by the account |
| `event.edit_owned` | Edit events owned by the account |
| `event.link_participants` | Link participant accounts to events |
| `event.manage_schedule` | Manage event schedule items |
| `event.manage_services` | Manage event services |
| `event.manage_documents` | Upload/manage event documents |
| `event.manage_contacts` | Manage event-level contacts |
| `vendor.confirm` | Confirm vendor services |
| `event.view_participant` | View events as a participant account |

Default permissions are auto-seeded when a membership is created, based on the account role. Permissions can be individually added or removed for fine-grained control.

### Owner vs Participant Distinction

- `events.owner_account_id` is the authoritative owner
- `event_accounts` holds non-owner participating accounts
- Owner-account members get broader access (edit, manage)
- Participant-account members get narrower access (view only, unless granted)
- The owner account is NEVER added to `event_accounts`

### Authorization Flow

1. **Database helper functions** (`is_staff()`, `can_view_event()`, etc.) are the source of truth
2. **RLS policies** use these helpers on every user-facing table
3. **Server Actions** run privileged writes with the service role
4. **Middleware** handles session refresh and auth redirects
5. The browser client reads data under RLS; writes go through Server Actions

### Write Path

All mutations go through Server Actions in `src/lib/actions/`. Every mutation:
- Verifies the caller's identity (`requireAdmin()` or `requireProfile()`)
- Uses the service role client for writes
- Logs an entry to `activity_log`
- Calls `revalidatePath()` to refresh affected pages

## Setup

### Prerequisites

- Node.js 22+
- A Supabase project

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

Run the migration against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or run the SQL directly in the Supabase SQL Editor:
# supabase/migrations/00001_initial_schema.sql
```

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm start
```

### Create First Admin

After deploying:

1. Sign in with email magic link
2. In the Supabase SQL Editor, promote your profile:

```sql
UPDATE profiles SET platform_role = 'platform_admin' WHERE email = 'your@email.com';
```

## Document Types

| Type | Label |
|------|-------|
| `site_map` | Site Map |
| `run_sheet` | Run Sheet |
| `vendor_packet` | Vendor Packet |
| `insurance_compliance` | Insurance / Compliance |
| `stage_plot` | Stage Plot |
| `parking_load_in` | Parking / Load-in |
| `misc` | Miscellaneous |

## Event Statuses

`draft` → `active` → `finalized` → `archived`

## Design Decisions

- **No custom JWT claims**: Permissions live in the database to avoid stale-permission problems
- **No multi-email-per-user**: If a company needs 5 logins, that means 5 auth users and 5 memberships
- **Contacts are not logins**: `account_contacts` stores operational contacts; only `profiles` can log in
- **No realtime/native/spreadsheet**: Deferred to post-MVP
- **Section-based event editor**: Services, schedule, locations, documents, and contacts are separate editable sections — not a spreadsheet
- **Activity log before notifications**: Every mutation logs to `activity_log`; notifications are built on top
