# Session Learnings - 2026-02-16

## Incident Summary
- A member (Aswini) appeared to have booked the same date twice.
- Booking history UI showed confusing signals during duplicate attempts.
- A later production deploy briefly caused API behavior where no players loaded.

## Why The Initial Duplicate Booking Bug Happened
- The production booking path (`api/index.ts`) allowed insert without a reliable duplicate guard.
- DB initially had no unique constraint on `(member_id, date)`.
- UI checks are non-authoritative and can be bypassed by near-simultaneous taps/requests.
- Cancellation logic deletes by `(member_id, date)`, so duplicate rows were removed together, masking root data issues.

## Key Findings From Production Data
- Same member ID booked the same date twice within seconds.
- Same device fingerprint was recorded for both events.
- Later cancellation removed both rows for that member/date.
- Table had only PK on `id`; no unique index on `(member_id, date)` before fix.

## Key Decisions Taken
- Added production DB unique index for booking identity:
  - `UNIQUE (member_id, date)` (`bookings_member_date_unique`).
- Standardized duplicate-booking conflict semantics:
  - Return `409 Conflict` for duplicate booking attempts.
- Added backend pre-check for better UX messaging, while treating DB constraint as final authority.
- Added frontend client lock for in-flight booking requests per `memberId:date` to reduce double-submit.
- Improved duplicate-attempt UX:
  - Show neutral informational toast instead of red destructive error.
  - Toast now includes short date (example: "You're all set for Fri, Feb 6.").

## Production Regression And Root Cause
- Regression: deploy caused "no players loaded."
- Root cause: introducing a shared import into `api/index.ts` (Vercel serverless entrypoint) broke runtime loading in production packaging context.
- Fix: keep `api/index.ts` self-contained and inline the booking validator helper there.

## Additional Hardening Decision
- Duplicate DB error matching was centralized to one helper to avoid copy/paste drift:
  - `api/booking-errors.ts`
  - Shared detection of duplicate violations by `code`/`constraint` (including nested `cause`).

## Operational Notes
- Local dev route path (`server/index.ts`/`server/routes.ts`) and production serverless path (`api/index.ts`) can diverge.
- Validate critical behavior against the production entrypoint path before deploy.

## Recommended Ongoing Guardrails
- Keep DB constraints as source of truth for data integrity.
- Keep API error semantics consistent (`409` for booking conflict).
- Prefer shared helper modules for cross-entrypoint behavior to prevent drift.
