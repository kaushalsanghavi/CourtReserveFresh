import { getMaxCapacityForDate } from "./booking-capacity.js";

export interface BookingValidationBooking {
  memberId: string;
}

export interface BookingValidationParams {
  date: string;
  memberId: string;
  getBookingsByDate: (date: string) => Promise<BookingValidationBooking[]>;
  maxCapacity?: number;
  weekdayOnly?: boolean;
}

export interface BookingValidationError {
  status: number;
  message: string;
}

/**
 * Shared booking guardrails used by all API entrypoints.
 * DB unique constraint remains the final authority for duplicates.
 */
export async function validateBookingRequest(
  params: BookingValidationParams,
): Promise<BookingValidationError | null> {
  const {
    date,
    memberId,
    getBookingsByDate,
    maxCapacity = getMaxCapacityForDate(date),
    weekdayOnly = true,
  } = params;

  if (weekdayOnly) {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        status: 400,
        message: "Bookings are only allowed on weekdays (Monday-Friday)",
      };
    }
  }

  const existingBookings = await getBookingsByDate(date);
  const hasExistingMemberBooking = existingBookings.some(
    (booking) => booking.memberId === memberId,
  );

  if (hasExistingMemberBooking) {
    return {
      status: 409,
      message: "Member already has a booking for this date",
    };
  }

  if (existingBookings.length >= maxCapacity) {
    return {
      status: 400,
      message: `This date is fully booked (${maxCapacity}/${maxCapacity} slots)`,
    };
  }

  return null;
}
