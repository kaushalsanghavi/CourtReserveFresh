export const DUPLICATE_BOOKING_MESSAGE =
  "Member already has a booking for this date";

export function isDuplicateBookingError(error: unknown): boolean {
  const err = error as any;
  return (
    err?.code === "23505" ||
    err?.code === 23505 ||
    err?.constraint === "bookings_member_date_unique" ||
    err?.cause?.code === "23505" ||
    err?.cause?.code === 23505 ||
    err?.cause?.constraint === "bookings_member_date_unique"
  );
}
