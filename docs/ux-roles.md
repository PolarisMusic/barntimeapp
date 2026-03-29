# Barn Time Portal — UX Role Spec

Three user experiences. One page structure. Data shapes the view.

## 1. Barn Time Staff (platform_admin / staff)

**Dashboard**: All events, all accounts. Full admin nav visible.
**Event workspace**: Full read/write on every section. Can create events, manage participants, confirm vendors, upload docs.
**Key affordance**: "Admin" link in nav. All sections always visible and editable.

## 2. Owner-Account User (standard user, member of event's owner account)

**Dashboard**: Events owned by their accounts. Role badge shows account_role (Owner/Manager/Coordinator/Viewer).
**Event workspace**: Sections visible based on account permissions:
- **account_owner / account_manager**: Edit contacts, schedule notes, service notes. Confirm vendors. Upload docs. Full section visibility.
- **event_coordinator**: Edit contacts, schedule notes, service notes. Upload docs. No vendor confirm (unless explicit grant). Full section visibility.
- **viewer**: Read-only on all visible sections. No edit affordances shown.

**Key affordance**: Edit buttons appear only on sections the user can modify. Permission badges removed — just show or hide the capability.

## 3. Participant-Account User (standard user, member of a participant account)

**Dashboard**: Events their account participates in. Badge shows "Participant".
**Event workspace** (standard visibility): All participant-shared sections. Read-only.
**Event workspace** (limited visibility): Only services (own account), public contacts, public documents. Schedule/locations/other services hidden.
**Key affordance**: Vendor confirm button if explicitly granted. Otherwise view-only with no edit affordances.

## Section Visibility Matrix

| Section    | Staff | Owner (any role) | Standard Participant | Limited Participant |
|------------|:-----:|:-----------------:|:--------------------:|:-------------------:|
| Overview   | Y     | Y                 | Y                    | Y                   |
| Schedule   | Y     | Y                 | Y                    | —                   |
| Services   | Y     | Y (all)           | Y (all)              | Own account only    |
| Contacts   | Y     | Y (all)           | Public only          | Public only         |
| Documents  | Y     | Y (all)           | Public only          | Public only         |
| Locations  | Y     | Y                 | Y                    | —                   |
| Updates    | Y     | Y                 | Y                    | Y                   |

## Edit Capability Matrix

| Action                  | Staff | Owner/Manager | Coordinator | Viewer | Participant |
|-------------------------|:-----:|:-------------:|:-----------:|:------:|:-----------:|
| Edit event details      | Y     | Y             | Y           | —      | —           |
| Manage contacts         | Y     | Y             | Y           | —      | —           |
| Edit schedule notes     | Y     | Y             | Y           | —      | —           |
| Edit service notes      | Y     | Y             | Y           | —      | —           |
| Confirm vendor          | Y     | Y             | Explicit    | —      | Explicit    |
| Upload documents        | Y     | Y             | Y           | —      | —           |
| Manage participants     | Y     | Y             | —           | —      | —           |

## Dashboard Card Layout

Each event card shows:
- Event name
- Date range (or "No date set")
- Primary location name (first location, or "No venue")
- Status badge
- Role badge (Owner · Manager · Coordinator · Viewer · Participant)
- Next upcoming schedule item title + time (if visible and exists)

## Empty States

Role-aware language:
- Owner seeing empty section: "No [items] yet. Add one to get started."
- Participant seeing empty section: "No shared [items] available for this event."
- Limited participant seeing hidden section: Section tab not shown.
