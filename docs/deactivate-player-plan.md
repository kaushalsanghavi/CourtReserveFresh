# Deactivate Player Implementation Plan

## Summary
This implementation adds soft deactivation/reactivation for players with a full audit trail, keeps existing `/api/members` default behavior non-breaking, blocks inactive players from new bookings server-side, and hides inactive players from the booking selector in the UI.

Chosen product decisions:
- Existing future bookings are kept when deactivating.
- Deactivation/reactivation is done via internal script (no admin UI/API endpoint).
- `/api/members` default contract stays unchanged.
- Reporting support is backend-ready now; report UI toggle comes later.
- Lifecycle is reversible (reactivate supported).
- Inactive players are hidden from booking selector.

## Public API / Interface / Type Changes
1. `Member` shape gains status fields in shared schema:
- `isActive: boolean`
- `statusChangedAt: Date`
2. New audit model:
- `MemberStatusEvent` with `id`, `memberId`, `fromIsActive`, `toIsActive`, `changedBy`, `reason`, `source`, `createdAt`
3. Add optional filtering capability without breaking defaults:
- `GET /api/members` remains default-all
- optional `?status=active|inactive|all` (default `all`)
4. Booking behavior contract:
- `POST /api/bookings` returns `403` when `memberId` is inactive
- existing duplicate/capacity/same-day errors remain unchanged

## Implementation Plan

### 1) Data Model + Migration
1. Update `shared/schema.ts`:
- Add `isActive` to `members` (`boolean`, `not null`, default `true`)
- Add `statusChangedAt` to `members` (`timestamp`, `not null`, default `now()`)
- Add `member_status_events` table with FK to `members.id`, transition fields, actor/reason/source, and `created_at`
- Export `MemberStatusEvent` and insert schema/type for status events
2. Add one idempotent migration script:
- `ALTER TABLE members ADD COLUMN IF NOT EXISTS ...`
- Backfill existing rows to active defaults
- `CREATE TABLE IF NOT EXISTS member_status_events (...)`
- Create index on `(member_id, created_at DESC)`

### 2) Server Storage + Domain Logic (Local Runtime)
1. Update `server/storage.ts`:
- Add `getMemberById(memberId)`
- Extend `getMembers(status?)` with optional status filter (default all)
- Add `setMemberActiveStatus({ memberId, toIsActive, changedBy, reason, source })`
- Write member status update + audit event in one transaction
- No-op guard when requested status equals current status
2. In booking creation path, enforce member eligibility before insert:
- Must exist
- Must be active

### 3) API Route Updates (Both Deployment Paths)
1. Update `server/routes.ts`:
- `GET /api/members` supports optional `status` query
- `POST /api/bookings` checks member active state and returns `403` if inactive
2. Mirror equivalent behavior in `api/index.ts` for Vercel parity.
3. Keep response payload backward compatible; only additive fields (`isActive`, `statusChangedAt`).

### 4) Script-Only Status Management
1. Add `scripts/member-status.ts` with commands:
- `deactivate --member-id <id> --changed-by <actor> [--reason "..."] [--source "script"]`
- `reactivate --member-id <id> --changed-by <actor> [--reason "..."] [--source "script"]`
- `history --member-id <id> [--limit <n>]`
2. Add `package.json` scripts:
- `member:deactivate`
- `member:reactivate`
- `member:status-history`
3. Default actor/source handling:
- `changedBy` required
- `source` defaults to `script`

### 5) Frontend Booking UX Behavior
1. Update `client/src/components/QuickBooking.tsx`:
- Filter selector list to `member.isActive === true`
- If cookie-selected member is now inactive, clear selection and cookie
2. Keep booking calendar/history rendering unchanged so existing bookings from inactive players still display as historical/current booking data.

### 6) Reporting/AI Backend Readiness (No UI Toggle Yet)
1. Keep current report UI unchanged.
2. Add backend support now:
- optional member status filter in member reads (`status` query)
- include `is_active` in AI member view definition in `scripts/setup-ai-views.ts` for future analytics/report toggles.

## Test Cases and Scenarios
1. Migration tests:
- Existing members become `isActive=true`
- `member_status_events` table exists and is writable
2. Script behavior:
- Deactivate active member writes one status event and flips `isActive=false`
- Reactivate inactive member writes one status event and flips `isActive=true`
- Repeating same transition is no-op and does not duplicate events
3. API behavior:
- `GET /api/members` returns all by default, including new status fields
- `GET /api/members?status=active` excludes inactive members
- `POST /api/bookings` with inactive member returns `403` and creates no booking/activity row
- `POST /api/bookings` with active member still succeeds
4. UI behavior:
- Inactive members do not appear in Quick Booking dropdown
- Stale cookie for inactive member is cleared
- Existing bookings of inactive members still render in booked-member chips/history
5. Regression checks:
- Duplicate booking, capacity, and same-day lock validations unchanged
- Existing routes/components compile and run in both local server and Vercel entrypoint

## Assumptions and Defaults
1. No authentication system exists yet; `changedBy` is provided explicitly via script argument.
2. `/api/members` remains default-all for backward compatibility; filtering is opt-in via query.
3. Deactivation does not auto-cancel future bookings.
4. No admin UI or public status mutation endpoint is added in this change.
5. Report UI toggle for including inactive players is deferred; backend support is added now.
