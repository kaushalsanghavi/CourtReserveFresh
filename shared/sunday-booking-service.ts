import { Booking, SundayBookingGroup, SundayBookingResponse } from "./schema";
import { 
  isSundayDate, 
  isFutureDate, 
  isFutureSunday, 
  getUpcomingSundays,
  groupSundayBookingsByDate,
  createSundayBookingGroup,
  toSundayBookingResponse,
  isValidTimeSlot
} from "./sunday-booking-utils";

/**
 * Sunday Booking Service
 * 
 * This service provides business logic for Sunday booking operations including:
 * - Grouping bookings by date
 * - Time slot management
 * - Capacity validation
 * - Permission checks
 */

export interface SundayBookingService {
  // Core grouping and data transformation
  groupBookingsByDate(bookings: Booking[]): Record<string, Booking[]>;
  createBookingGroups(dates: string[], bookings: Booking[]): SundayBookingGroup[];
  transformToApiResponse(groups: SundayBookingGroup[]): SundayBookingResponse[];
  
  // Time slot management
  canSetTimeSlot(date: string, existingBookings?: Booking[]): boolean;
  canModifyTimeSlot(date: string, existingBookings?: Booking[]): boolean;
  validateTimeSlotChange(date: string, newTimeSlot: string, memberId: string): ValidationResult;
  
  // Capacity and booking validation
  validateBookingCapacity(date: string, existingBookings: Booking[]): ValidationResult;
  validateNewBooking(memberId: string, date: string, existingBookings: Booking[], timeSlot?: string): ValidationResult;
  
  // Helper functions
  getAvailableSpots(bookings: Booking[]): number;
  isBookingFull(bookings: Booking[]): boolean;
  getMemberBooking(memberId: string, bookings: Booking[]): Booking | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface TimeSlotChangeRequest {
  date: string;
  newTimeSlot: string;
  memberId: string;
  memberName: string;
}

export interface BookingRequest {
  memberId: string;
  memberName: string;
  date: string;
  timeSlot?: string;
}

/**
 * Implementation of Sunday Booking Service
 */
export class SundayBookingServiceImpl implements SundayBookingService {
  private static readonly MAX_CAPACITY = 6;

  /**
   * Groups Sunday bookings by date
   */
  groupBookingsByDate(bookings: Booking[]): Record<string, Booking[]> {
    return groupSundayBookingsByDate(bookings);
  }

  /**
   * Creates SundayBookingGroup objects for given dates and bookings
   */
  createBookingGroups(dates: string[], bookings: Booking[]): SundayBookingGroup[] {
    const groupedBookings = this.groupBookingsByDate(bookings);
    
    return dates.map(date => {
      const bookingsForDate = groupedBookings[date] || [];
      return createSundayBookingGroup(date, bookingsForDate);
    });
  }

  /**
   * Transforms SundayBookingGroup objects to API response format
   */
  transformToApiResponse(groups: SundayBookingGroup[]): SundayBookingResponse[] {
    return groups.map(group => toSundayBookingResponse(group));
  }

  /**
   * Determines if a time slot can be set for a given date
   * Time slots can be set if:
   * - The date is a future Sunday
   * - No time slot is currently set (first booking scenario)
   */
  canSetTimeSlot(date: string, existingBookings: Booking[] = []): boolean {
    // Must be a future Sunday
    if (!isFutureSunday(date)) {
      return false;
    }

    // If there are no existing bookings, time slot can be set
    if (existingBookings.length === 0) {
      return true;
    }

    // If existing bookings don't have a time slot set, it can be set
    const hasTimeSlot = existingBookings.some(booking => booking.timeSlot);
    return !hasTimeSlot;
  }

  /**
   * Determines if a time slot can be modified for a given date
   * Time slots can always be modified for future Sundays (per requirements)
   */
  canModifyTimeSlot(date: string, existingBookings: Booking[] = []): boolean {
    // Must be a future Sunday
    if (!isFutureSunday(date)) {
      return false;
    }

    // Per requirements: any player can modify time slots at any time
    return true;
  }

  /**
   * Validates a time slot change request
   */
  validateTimeSlotChange(date: string, newTimeSlot: string, memberId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate date is a future Sunday
    if (!isSundayDate(date)) {
      errors.push("Time slots can only be set for Sunday bookings");
    }

    if (!isFutureDate(date)) {
      errors.push("Cannot modify time slots for past dates");
    }

    // Validate time slot format
    if (!isValidTimeSlot(newTimeSlot)) {
      errors.push("Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'");
    }

    // Validate member ID
    if (!memberId || memberId.trim().length === 0) {
      errors.push("Member ID is required for time slot changes");
    }

    // Add warning about notifying other members
    if (errors.length === 0) {
      warnings.push("All existing bookings for this date will be updated with the new time slot");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates booking capacity for a given date
   */
  validateBookingCapacity(date: string, existingBookings: Booking[]): ValidationResult {
    const errors: string[] = [];

    // Check if at capacity
    if (existingBookings.length >= SundayBookingServiceImpl.MAX_CAPACITY) {
      errors.push(`This Sunday is fully booked (${SundayBookingServiceImpl.MAX_CAPACITY}/${SundayBookingServiceImpl.MAX_CAPACITY} slots)`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a new booking request
   */
  validateNewBooking(
    memberId: string, 
    date: string, 
    existingBookings: Booking[], 
    timeSlot?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate date is a future Sunday
    if (!isSundayDate(date)) {
      errors.push("This booking type is only available for Sundays");
    }

    if (!isFutureDate(date)) {
      errors.push("Cannot book slots for past dates");
    }

    // Check if member already has a booking
    const existingMemberBooking = this.getMemberBooking(memberId, existingBookings);
    if (existingMemberBooking) {
      errors.push("Member already has a booking for this Sunday");
    }

    // Check capacity
    const capacityValidation = this.validateBookingCapacity(date, existingBookings);
    if (!capacityValidation.isValid) {
      errors.push(...capacityValidation.errors);
    }

    // Validate time slot requirements
    const hasExistingTimeSlot = existingBookings.length > 0 && existingBookings[0].timeSlot;
    
    if (!hasExistingTimeSlot && !timeSlot) {
      errors.push("Time slot is required for the first Sunday booking");
    }

    if (timeSlot && !isValidTimeSlot(timeSlot)) {
      errors.push("Time slot must be in format 'HH:MM AM/PM - HH:MM AM/PM'");
    }

    // Add informational warnings
    if (errors.length === 0) {
      const availableSpots = this.getAvailableSpots(existingBookings) - 1; // -1 for the new booking
      if (availableSpots > 0) {
        warnings.push(`${availableSpots} spots will remain available after this booking`);
      } else {
        warnings.push("This booking will fill the last available spot");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets the number of available spots for a set of bookings
   */
  getAvailableSpots(bookings: Booking[]): number {
    return Math.max(0, SundayBookingServiceImpl.MAX_CAPACITY - bookings.length);
  }

  /**
   * Checks if a booking is at full capacity
   */
  isBookingFull(bookings: Booking[]): boolean {
    return bookings.length >= SundayBookingServiceImpl.MAX_CAPACITY;
  }

  /**
   * Finds a member's booking in a list of bookings
   */
  getMemberBooking(memberId: string, bookings: Booking[]): Booking | null {
    return bookings.find(booking => booking.memberId === memberId) || null;
  }
}

/**
 * Singleton instance of the Sunday Booking Service
 */
export const sundayBookingService = new SundayBookingServiceImpl();

/**
 * Helper functions for common Sunday booking operations
 */

/**
 * Processes upcoming Sunday bookings and returns formatted response
 */
export const processUpcomingSundayBookings = (
  allSundayBookings: Booking[], 
  weeksAhead: number = 6
): SundayBookingResponse[] => {
  const upcomingSundays = getUpcomingSundays(weeksAhead);
  const groups = sundayBookingService.createBookingGroups(upcomingSundays, allSundayBookings);
  return sundayBookingService.transformToApiResponse(groups);
};

/**
 * Validates and processes a time slot change
 */
export const processTimeSlotChange = (
  request: TimeSlotChangeRequest,
  existingBookings: Booking[]
): { success: boolean; result?: SundayBookingGroup; validation: ValidationResult } => {
  const validation = sundayBookingService.validateTimeSlotChange(
    request.date, 
    request.newTimeSlot, 
    request.memberId
  );

  if (!validation.isValid) {
    return { success: false, validation };
  }

  // Create updated booking group with new time slot
  const updatedBookings = existingBookings.map(booking => ({
    ...booking,
    timeSlot: request.newTimeSlot,
    timeSetBy: request.memberId,
    timeSetAt: new Date()
  }));

  const result = createSundayBookingGroup(request.date, updatedBookings);

  return { success: true, result, validation };
};

/**
 * Validates and processes a new booking
 */
export const processNewBooking = (
  request: BookingRequest,
  existingBookings: Booking[]
): { success: boolean; validation: ValidationResult; timeSlotInfo?: { timeSlot: string; timeSetBy: string; timeSetAt: Date } } => {
  const validation = sundayBookingService.validateNewBooking(
    request.memberId,
    request.date,
    existingBookings,
    request.timeSlot
  );

  if (!validation.isValid) {
    return { success: false, validation };
  }

  // Determine time slot information
  let timeSlotInfo: { timeSlot: string; timeSetBy: string; timeSetAt: Date } | undefined;

  if (existingBookings.length > 0 && existingBookings[0].timeSlot) {
    // Use existing time slot
    timeSlotInfo = {
      timeSlot: existingBookings[0].timeSlot,
      timeSetBy: existingBookings[0].timeSetBy!,
      timeSetAt: existingBookings[0].timeSetAt!
    };
  } else if (request.timeSlot) {
    // Set new time slot
    timeSlotInfo = {
      timeSlot: request.timeSlot,
      timeSetBy: request.memberId,
      timeSetAt: new Date()
    };
  }

  return { success: true, validation, timeSlotInfo };
};

/**
 * Gets booking statistics for a set of Sunday bookings
 */
export const getSundayBookingStats = (bookings: Booking[]): {
  totalBookings: number;
  uniqueDates: number;
  averageParticipantsPerDate: number;
  fullBookings: number;
  datesWithTimeSlots: number;
} => {
  const groupedBookings = sundayBookingService.groupBookingsByDate(bookings);
  const dates = Object.keys(groupedBookings);
  
  const fullBookings = dates.filter(date => 
    sundayBookingService.isBookingFull(groupedBookings[date])
  ).length;
  
  const datesWithTimeSlots = dates.filter(date =>
    groupedBookings[date].some(booking => booking.timeSlot)
  ).length;

  const totalParticipants = Object.values(groupedBookings)
    .reduce((sum, bookings) => sum + bookings.length, 0);

  return {
    totalBookings: bookings.length,
    uniqueDates: dates.length,
    averageParticipantsPerDate: dates.length > 0 ? totalParticipants / dates.length : 0,
    fullBookings,
    datesWithTimeSlots
  };
};