import { addDays, isAfter, isBefore, startOfDay } from "date-fns";

const ROLLING_WINDOW_DAYS = 28;

export function isPastBookingDate(date: Date, now: Date = new Date()): boolean {
  return isBefore(startOfDay(date), startOfDay(now));
}

export function isDateOutsideRollingBookingWindow(
  date: Date,
  now: Date = new Date(),
): boolean {
  const bookingWindowEnd = addDays(startOfDay(now), ROLLING_WINDOW_DAYS - 1);
  return isAfter(startOfDay(date), bookingWindowEnd);
}
