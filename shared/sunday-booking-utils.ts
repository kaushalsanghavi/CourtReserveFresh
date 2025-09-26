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
 * Validates time slot format - now much more flexible
 * Accepts formats like:
 * - "8:00 AM - 9:00 AM" (standard)
 * - "8:00 am - 9:00 am" (lowercase)
 * - "8 - 9 AM" (no minutes, shared AM/PM)
 * - "8 - 9" (simple format)
 * - "7:30 - 9:00" (mixed format)
 */
export const isValidTimeSlot = (timeSlot: string): boolean => {
  if (!timeSlot || typeof timeSlot !== 'string') {
    return false;
  }

  const trimmed = timeSlot.trim();
  
  // Must contain a dash to separate start and end times
  if (!trimmed.includes('-')) {
    return false;
  }

  const parts = trimmed.split('-');
  if (parts.length !== 2) {
    return false;
  }

  const startPart = parts[0].trim();
  const endPart = parts[1].trim();

  // Both parts must be non-empty
  if (!startPart || !endPart) {
    return false;
  }

  // Helper function to validate a time part (more flexible)
  const isValidTimePart = (timePart: string): boolean => {
    // Remove AM/PM and normalize case
    const cleanTime = timePart.replace(/\s*(am|pm|AM|PM)\s*$/i, '').trim();
    
    // Check if it's just a number (like "8" or "9")
    if (/^\d{1,2}$/.test(cleanTime)) {
      const hour = parseInt(cleanTime, 10);
      return hour >= 1 && hour <= 12;
    }
    
    // Check if it's in HH:MM format (like "8:00" or "10:30")
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
      const [hourStr, minuteStr] = cleanTime.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
    }
    
    return false;
  };

  // Validate both time parts
  return isValidTimePart(startPart) && isValidTimePart(endPart);
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
    errors.push("Time slot must be in format like '8:00 AM - 9:00 AM', '8 - 9 AM', or '8 - 9'");
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