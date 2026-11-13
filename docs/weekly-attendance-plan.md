# Weekly Attendance Implementation Plan

## Problem
When every slot on a day is full and someone else wants to play, nobody can easily tell who should give up a space. Monthly Participation does not answer this, because a person can be low for the month but already high for this particular week.

## Decision
Build only the inline option (mockup Option B in `output/weekly-attendance-mockup-options.html`). There is no new tab. On a **full day**, each booked-member chip shows how many days that person has booked in that week. Heavy bookers are highlighted, and heavy bookers who are also high for the month are highlighted further.

Not building: the Weekly Attendance tab, the week picker, the per-day bars, a month column, or any enforcement.

## Behaviour
1. **Where:** `DayCard` in `BookingCalendar.tsx`, on booked-member chips, only when the day is full (bookings >= `getMaxCapacityForDate(date)`, currently 5). Days with open slots are unchanged.
2. **Label:** a "Days this week" caption on the right of the "Booked members" heading, shown with the counts.
3. **Count:** distinct days the member has booked in the Monday-Sunday week containing the card's date (past and future days of that week included). Cancelled bookings are deleted rows, so they drop out automatically.
4. **Three levels:**

| Level | Rule | Style |
|---|---|---|
| Normal | 3 or fewer days booked this week | white pill, gray text |
| Heavy week | more than 3 days this week (4 or 5) | amber pill (`bg-amber-100 text-amber-700`) |
| Heavy week and high month | heavy week and monthly participation above 65% | soft pink pill (`bg-pink-100 text-pink-700`) |

5. **Monthly participation %** uses the same definition as the Monthly Participation tab: distinct booked days in the card's calendar month divided by weekdays in that month, rounded to a whole percent. The 65% test is "greater than 65" on the rounded number, so it matches what the monthly tab displays. Future bookings in the month count, as they do on that tab.
6. **Details on tap (mobile first):** the app is used mainly on mobile web, so hover cannot be the only way to see detail. Each pill is a button; tapping it opens a small popover with the member name, "N days booked this week" and "X% of the month booked". Tapping elsewhere dismisses it. The pill has an enlarged invisible tap area (about 8px around it). The `title` tooltip is kept for desktop, and the `aria-label` carries the same information for screen readers.

## Implementation

### Shared logic: `shared/weekly-bookings.ts`
- `HEAVY_WEEK_THRESHOLD = 3`, `isHeavyWeek(n)`
- `getWeekBounds(date)`: Monday-Sunday bounds as `YYYY-MM-DD`
- `getWeeklyBookingCount(bookings, memberId, date)`
- `HIGH_MONTHLY_PARTICIPATION_PERCENT = 65`
- `getMonthlyParticipationPercent(bookings, memberId, date)`
- `getWeeklyBadgeLevel(daysThisWeek, monthlyPercent)` returning `normal | heavy | heavy-high-month`
- Dates are compared as `YYYY-MM-DD` strings to avoid timezone drift.

### UI: `client/src/components/BookingCalendar.tsx`
- `DayCard` already receives all bookings, so there is no new fetch, API or schema change.
- Compute `showWeeklyCounts` from the day's booking count and capacity, then render the pill inside each chip as a Radix `Popover` trigger (`@/components/ui/popover`) with `data-testid="weekly-count-<memberId>-<date>"` and a `data-level` attribute; the popover content has `weekly-count-details-<memberId>-<date>`.

### Tests: `tests/unit/weekly-bookings.test.ts`
- Week bounds, including a month boundary.
- Distinct-day counting scoped to one member and one week.
- Heavy threshold (3 is normal, 4 is heavy).
- Tapping a pill opens the details popover (component test).
- Monthly percent matches the monthly tab formula.
- Level escalation at 65 versus 66.
- Run `npm run check:regression` before committing.

## Edge cases
- A member with several heavy weeks in a month will naturally cross 65%; that is the intended signal, not a bug.
- Weekend bookings, if any exist, still count toward the week and month counts but cannot appear on the weekday-only calendar.
- Inactive members with bookings still appear on chips, as before.
- Capacity changes by date are handled by `getMaxCapacityForDate`.

## Out of scope
- A dedicated weekly tab, week picker or per-day breakdown.
- Automatic "who should give up a slot" recommendations or enforcement.
- Changing Monthly Participation calculations.
