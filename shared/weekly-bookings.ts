import { addDays, eachDayOfInterval, endOfMonth, format, isWeekend, parseISO, startOfMonth, startOfWeek } from "date-fns";

// A week with more than 3 booked days is flagged as a heavy week.
export const HEAVY_WEEK_THRESHOLD = 3;

export function isHeavyWeek(daysBooked: number): boolean {
  return daysBooked > HEAVY_WEEK_THRESHOLD;
}

// Monday-Sunday bounds (YYYY-MM-DD) of the week containing `date`.
export function getWeekBounds(date: string): { start: string; end: string } {
  const monday = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  return {
    start: format(monday, "yyyy-MM-dd"),
    end: format(addDays(monday, 6), "yyyy-MM-dd"),
  };
}

// Number of distinct days a member has booked in the week containing `date`.
export function getWeeklyBookingCount(
  bookings: ReadonlyArray<{ memberId: string; date: string }>,
  memberId: string,
  date: string,
): number {
  const { start, end } = getWeekBounds(date);
  const days = new Set<string>();
  for (const booking of bookings) {
    if (booking.memberId === memberId && booking.date >= start && booking.date <= end) {
      days.add(booking.date);
    }
  }
  return days.size;
}

// Among heavy-week players, those above this monthly participation % get extra emphasis.
export const HIGH_MONTHLY_PARTICIPATION_PERCENT = 65;

// Monthly participation % for the month containing `date`. Matches the Monthly
// Participation tab: distinct booked days / weekdays in the month, rounded.
export function getMonthlyParticipationPercent(
  bookings: ReadonlyArray<{ memberId: string; date: string }>,
  memberId: string,
  date: string,
): number {
  const anchor = parseISO(date);
  const weekdays = eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) }).filter(
    (day) => !isWeekend(day),
  ).length;
  if (weekdays === 0) return 0;
  const monthPrefix = date.slice(0, 7);
  const days = new Set<string>();
  for (const booking of bookings) {
    if (booking.memberId === memberId && booking.date.startsWith(monthPrefix)) {
      days.add(booking.date);
    }
  }
  return Math.round((days.size / weekdays) * 100);
}

export type WeeklyBadgeLevel = "normal" | "heavy" | "heavy-high-month";

export function getWeeklyBadgeLevel(daysBookedThisWeek: number, monthlyPercent: number): WeeklyBadgeLevel {
  if (!isHeavyWeek(daysBookedThisWeek)) return "normal";
  return monthlyPercent > HIGH_MONTHLY_PARTICIPATION_PERCENT ? "heavy-high-month" : "heavy";
}
