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
│   ├── api/
│   │   └── documents/[id]/      # Secure document download (signed URLs)
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
│   │           ├── contacts/    # Event-scoped contact assignments
│   │           └── documents/
│   └── portal/                  # Client-facing portal
│       └── events/
│           └── [id]/
│               ├── layout.tsx   # Shared event workspace (header + tabs)
│               ├── schedule/    # Editable schedule notes
│               ├── services/    # Editable service notes + vendor confirm
│               ├── contacts/    # Contact assign/edit/remove
│               ├── locations/
│               ├── documents/   # Upload/edit/delete
│               ├── participants/ # Owner-side participant management
│               └── updates/     # Visibility-filtered activity feed
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
│   ├── permissions.ts           # Server-side permission checks (wraps DB RPCs)
│   └── actions/                 # Server Actions (all write operations)
│       ├── accounts.ts
│       ├── events.ts
│       ├── contacts.ts
│       ├── documents.ts
│       ├── linkable-accounts.ts # Curated participant allowlist management
│       └── activity-log.ts
├── types/
│   ├── database.ts              # Re-export from generated types
│   └── database.generated.ts    # Generated types (npm run db:types)
└── middleware.ts                 # Next.js middleware (auth redirect)

supabase/
├── migrations/
│   ├── 00001_initial_schema.sql    # Tables, enums, RLS, helpers, read models
│   ├── 00002_permission_hardening.sql  # Event contacts, visibility enums, new helpers
│   ├── 00003_permission_model_v2.sql   # Role defaults + explicit overrides model
│   ├── 00004_unify_permission_checks.sql # Unify all helpers on computed-default model
│   ├── 00005_visibility_aware_counts.sql # Visibility-aware event_summary counts
│   ├── 00006_dashboard_enhancements.sql  # Dashboard RPCs with location/schedule/timezone
│   ├── 00007_fix_dashboard_dedupe.sql    # DISTINCT ON dedupe for dashboard
│   ├── 00008_linkable_accounts_and_activity_details.sql # Curated participant directory + structured activity details
│   └── 00009_auto_create_documents_bucket.sql           # Auto-create private documents storage bucket
├── seed.sql                     # Deterministic local-dev seed (auth users, accounts, event, activity)
└── tests/
    └── permission_tests.sql     # Permission integration tests (data + auth context)
```

## Architecture

### Core Primitives

| Primitive | Purpose |
|-----------|---------|
| `profiles` | Login identity (1:1 with auth.users) |
| `accounts` | Business/entity (client, vendor, venue, performer, internal) |
| `account_memberships` | Links profiles to accounts with a role |
| `account_membership_permissions` | Explicit permission overrides beyond role defaults |
| `account_contacts` | Operational contacts (not necessarily logins) |
| `events` | Production/event record |
| `event_accounts` | Participant accounts linked to an event |
| `event_contact_roles` | Event-scoped contact assignments with visibility |
| `event_locations` | Locations for an event |
| `event_services` | Services/vendors for an event |
| `event_schedule_items` | Timeline items for an event |
| `event_documents` | Files attached to an event |
| `account_linkable_accounts` | Curated allowlist of accounts for the participant picker |
| `activity_log` | Audit trail for all mutations (with structured details) |

### Permission Model (3 Layers)

**1. Platform Role** (in `profiles`):
- `platform_admin` — full system access
- `staff` — full system access (operational)
- `standard` — access only through account memberships

**2. Account Role** (in `account_memberships`):
- `account_owner` — all permissions within the account
- `account_manager` — most permissions, including vendor confirmation
- `event_coordinator` — event management, no member management or vendor confirm
- `viewer` — read-only access

**3. Permission Grants** (computed defaults + explicit overrides):

| Key | Owner | Manager | Coordinator | Viewer |
|-----|:-----:|:-------:|:-----------:|:------:|
| `account.manage_members` | Y | | | |
| `account.manage_contacts` | Y | Y | | |
| `event.create` | Y | Y | | |
| `event.view_owned` | Y | Y | Y | Y |
| `event.edit_owned` | Y | Y | Y | |
| `event.link_participants` | Y | Y | | |
| `event.manage_schedule` | Y | Y | Y | |
| `event.manage_services` | Y | Y | Y | |
| `event.manage_documents` | Y | Y | Y | |
| `event.manage_contacts` | Y | Y | Y | |
| `vendor.confirm` | Y | Y | | |
| `event.view_participant` | Y | Y | Y | Y |

**Default permissions are computed at query time** from `get_default_permissions(role)`. The `account_membership_permissions` table stores **only explicit overrides** — additional grants beyond the role's defaults. Changing a user's role does not destroy their explicit overrides.

### Owner vs Participant Distinction

- `events.owner_account_id` is the authoritative owner
- `event_accounts` holds non-owner participating accounts
- Owner-account members get broader access (edit, manage)
- Participant-account members get narrower access (view only, unless granted)
- The owner account is NEVER added to `event_accounts`

### Participant Visibility

Participant accounts have a `visibility` level: `limited` or `standard`.

| Section | Owner Members | Standard Participants | Limited Participants |
|---------|:------------:|:--------------------:|:-------------------:|
| Event overview | Y | Y | Y |
| Schedule | Y | Y | |
| Locations | Y | Y | |
| Services | Y | Y (all) | Own account's only |
| Documents (all_participants) | Y | Y | Y |
| Documents (owner_only) | Y | | |
| Contacts (all_participants) | Y | Y | Y |
| Contacts (owner_only) | Y | | |

### Authorization Flow

1. **Database helper functions** (`is_staff()`, `can_view_event()`, `membership_has_permission()`, etc.) are the source of truth
2. **RLS policies** use these helpers on every user-facing table
3. **Server-side permission checks** (`src/lib/permissions.ts`) wrap DB RPCs for use in Server Actions
4. **Server Actions** authenticate → check permission → write with service role → log activity
5. **Middleware** handles session refresh and auth redirects
6. The browser client reads data under RLS; writes go through Server Actions

### Document Access

Documents are stored in a Supabase Storage bucket. Access is controlled by:
- **Visibility**: `owner_only` (only owner-account members) or `all_participants` (anyone who can view the event)
- **Download**: `/api/documents/[id]` authenticates the user, verifies RLS access, generates a signed URL, and redirects

### Event-Scoped Contacts

Account contacts can be assigned to events via `event_contact_roles`:
- Each assignment has a `role_label` (e.g., "Day-of Coordinator") and `visibility` (`owner_only` or `all_participants`)
- RLS enforces visibility: participants only see `all_participants` contacts
- This is separate from the account contact directory

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker (required by Supabase CLI)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Quick Start (one command)

```bash
npm run setup              # installs deps, starts Supabase, seeds DB, writes .env.local
npm run dev                # open http://localhost:3000
```

That's it. Six test users, a seeded event, and the documents storage bucket are all created automatically. Sign in with any test email below — get the magic link from Inbucket at http://localhost:54324.

> **First time?** If you don't have `npm` yet, run `npm run setup` after cloning. The script handles `npm ci`, `supabase start`, `supabase db reset`, and `.env.local` generation in one shot. All you need pre-installed is Node.js 20+, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).

### Test Accounts

Sign in with any of these emails using magic link. Check Inbucket at http://localhost:54324 to get the link.

| Email | Role | Access |
|-------|------|--------|
| `admin@barntime.net` | Staff | Full admin access at `/admin` |
| `owner@sunsetweddings.com` | Account Owner (Sunset Weddings) | Full owner access to the seeded event |
| `coordinator@sunsetweddings.com` | Event Coordinator (Sunset Weddings) | Can edit schedule, services, contacts, documents |
| `viewer@sunsetweddings.com` | Viewer (Sunset Weddings) | Read-only access to all sections |
| `vendor@bayareasound.com` | Standard Participant (Bay Area Sound) | Can see schedule, locations, all services |
| `venuemanager@redwoodestate.com` | Limited Participant (Redwood Estate) | Own services only, no schedule/locations |

### Local Dev Scripts

| Command | What it does |
|---------|--------------|
| `npm run setup` | Full setup: install deps, start Supabase, seed DB, write `.env.local` |
| `npm run local:start` | Start local Supabase |
| `npm run local:reset` | Reset DB, reapply migrations and seed |
| `npm run local:bootstrap` | Start Supabase + reset DB (one command) |
| `npm run local:status` | Print local Supabase URLs and keys |

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values from `npm run local:status`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-status>
```

### Type Generation

Database types are generated from the schema. Both scripts reset the local DB from migrations first, so the output is always deterministic.

```bash
npm run db:types         # Reset DB, regenerate src/types/database.generated.ts
npm run db:types:check   # Reset DB, regenerate to temp file, diff against committed file
```

### After Changing Migrations or Functions

Whenever you modify a migration, add a new migration, or change any SQL function return type, view, enum, or table column:

1. Run `supabase start` (if not already running)
2. Run `npm run db:types`
3. Commit both the migration change **and** the regenerated `src/types/database.generated.ts` in the same PR

**Important rules:**
- Do not edit old migrations after they have been applied — add a new migration instead
- Always regenerate types after schema changes; CI will reject stale types
- The committed `database.generated.ts` must match what CI produces from the migration chain

### Build

```bash
npm run build
npm start
```

### Running Permission Tests

After applying all migrations, run the test suite:

```bash
# In the Supabase SQL Editor, paste and run:
# supabase/tests/permission_tests.sql
```

Tests cover:
- Role default computation
- Effective permission resolution (defaults + overrides)
- Role change preserving explicit overrides
- `membership_has_permission()` correctness
- Auth-context tests for all user roles (owner, coordinator, viewer, participant, unrelated, staff)
- Dashboard and event summary RPC access
- Document visibility enforcement (owner_only vs all_participants)
- Contact visibility enforcement
- Participant visibility enforcement (limited vs standard)

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

## Account Types

`client` · `vendor` · `venue` · `performer` · `internal`

## Event Statuses

`draft` → `active` → `finalized` → `archived`

## Design Decisions

- **No custom JWT claims**: Permissions live in the database to avoid stale-permission problems
- **Computed role defaults**: Default permissions are derived from the role at query time, not stored as rows. Only explicit overrides are persisted. This means role changes don't destroy custom grants.
- **No multi-email-per-user**: If a company needs 5 logins, that means 5 auth users and 5 memberships
- **Contacts are not logins**: `account_contacts` stores operational contacts; only `profiles` can log in
- **Event-scoped contacts**: Contacts are assigned to events explicitly via `event_contact_roles`, not leaked from all linked accounts
- **Participant visibility tiers**: Limited participants see only their own services, public contacts, and public documents. Standard participants see all participant-shared sections.
- **No realtime/native/spreadsheet**: Deferred to post-MVP
- **Section-based event editor**: Services, schedule, locations, documents, and contacts are separate editable sections — not a spreadsheet
- **Activity log before notifications**: Every mutation logs to `activity_log`; notifications are built on top
