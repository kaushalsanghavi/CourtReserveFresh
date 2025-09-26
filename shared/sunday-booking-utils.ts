import { Booking, SundayBookingGroup, SundayBookingResponse } from "./schema";

/**
 * Helper functions for Sunday booking operations
 */

/**
 * Checks if a given date string represents a Sunday
 */
export const isSundayDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date.getDay() === 0; // Sunday is 0
};

/**
 * Validates time slot format (e.g., "8:00 AM - 9:00 AM")
 */
export const isValidTimeSlot = (timeSlot: string): boolean => {
  // Matches formats like "8:00 AM - 9:00 AM", "10:30 AM - 11:30 AM", etc.
  const timeSlotRegex = /^(1[0-2]|[1-9]):[0-5][0-9] (AM|PM) - (1[0-2]|[1-9]):[0-5][0-9] (AM|PM)$/;
  return timeSlotRegex.test(timeSlot);
};

/**
 * Checks if a date is in the future (including today)
 */
export const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  return date >= today;
};

/**
 * Checks if a date is a future Sunday
 */
export const isFutureSunday = (dateString: string): boolean => {
  return isSundayDate(dateString) && isFutureDate(dateString);
};

/**
 * Gets the next N Sundays from today
 */
export const getUpcomingSundays = (count: number = 6): string[] => {
  const sundays: string[] = [];
  const today = new Date();
  
  // Find the next Sunday
  let nextSunday = new Date(today);
  const daysUntilSunday = (7 - today.getDay()) % 7;
  if (daysUntilSunday === 0 && today.getDay() === 0) {
    // If today is Sunday, start from today
    nextSunday = new Date(today);
  } else {
    nextSunday.setDate(today.getDate() + daysUntilSunday);
  }
  
  // Generate the requested number of Sundays
  for (let i = 0; i < count; i++) {
    const sunday = new Date(nextSunday);
    sunday.setDate(nextSunday.getDate() + (i * 7));
    sundays.push(sunday.toISOString().split('T')[0]); // YYYY-MM-DD format
  }
  
  return sundays;
};

/**
 * Groups Sunday bookings by date
 */
export const groupSundayBookingsByDate = (bookings: Booking[]): Record<string, Booking[]> => {
  return bookings
    .filter(booking => booking.isSundayBooking)
    .reduce((groups, booking) => {
      if (!groups[booking.date]) {
        groups[booking.date] = [];
      }
      groups[booking.date].push(booking);
      return groups;
    }, {} as Record<string, Booking[]>);
};

/**
 * Converts grouped bookings to SundayBookingGroup format
 */
export const createSundayBookingGroup = (
  date: string,
  bookings: Booking[] = []
): SundayBookingGroup => {
  // Find the time slot info from any booking (they should all have the same time slot)
  const firstBooking = bookings[0];
  
  return {
    date,
    timeSlot: firstBooking?.timeSlot || null,
    timeSetBy: firstBooking?.timeSetBy || null,
    timeSetAt: firstBooking?.timeSetAt || null,
    participants: bookings,
    availableSpots: Math.max(0, 6 - bookings.length), // Max 6 participants
  };
};

/**
 * Converts SundayBookingGroup to API response format
 */
export const toSundayBookingResponse = (group: SundayBookingGroup): SundayBookingResponse => {
  return {
    date: group.date,
    timeSlot: group.timeSlot,
    timeSetBy: group.timeSetBy,
    participants: group.participants.map(booking => ({
      memberId: booking.memberId,
      memberName: booking.memberName,
      joinedAt: booking.createdAt.toISOString(),
    })),
    availableSpots: group.availableSpots,
  };
};

/**
 * Validates that a booking request is valid for Sunday bookings
 */
export const validateSundayBookingRequest = (data: {
  date: string;
  timeSlot?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if it's a Sunday
  if (!isSundayDate(data.date)) {
    errors.push("Date must be a Sunday");
  }
  
  // Check if it's in the future
  if (!isFutureDate(data.date)) {
    errors.push("Date must be in the future");
  }
  
  // Check time slot format if provided
  if (data.timeSlot && !isValidTimeSlot(data.timeSlot)) {
    errors.push("Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Checks if a Sunday booking can have its time slot modified
 * (Always true for Sunday bookings as per requirements)
 */
export const canModifyTimeSlot = (date: string): boolean => {
  return isFutureSunday(date);
};

/**
 * Parses time slot string to get start and end times
 */
export const parseTimeSlot = (timeSlot: string): { start: string; end: string } | null => {
  const match = timeSlot.match(/^(.+) - (.+)$/);
  if (!match) return null;
  
  return {
    start: match[1].trim(),
    end: match[2].trim(),
  };
};

/**
 * Formats a time slot from start and end times
 */
export const formatTimeSlot = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};