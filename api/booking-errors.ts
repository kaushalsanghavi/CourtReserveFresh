export const DUPLICATE_BOOKING_MESSAGE =
  "Member already has a booking for this date";

export function isDuplicateBookingError(error: unknown): boolean {
  const entries = collectErrorChain(error);
  return entries.some((err) => {
    const code = err?.code;
    const constraint = asString(err?.constraint).toLowerCase();
    const message = asString(err?.message).toLowerCase();
    const detail = asString(err?.detail).toLowerCase();

    if (code === "23505" || code === 23505) return true;
    if (constraint === "bookings_member_date_unique") return true;

    // Defensive fallback for provider/runtime variants where codes may be wrapped or omitted.
    return (
      (message.includes("duplicate key value violates unique constraint") ||
        detail.includes("duplicate key value violates unique constraint")) &&
      (message.includes("bookings_member_date_unique") ||
        detail.includes("bookings_member_date_unique"))
    );
  });
}

function collectErrorChain(error: unknown): any[] {
  const seen = new Set<any>();
  const queue: any[] = [error];
  const out: any[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    out.push(current);

    if (typeof current === "object") {
      queue.push((current as any).cause);
      queue.push((current as any).sourceError);
      queue.push((current as any).originalError);
      queue.push((current as any).error);
    }
  }

  return out;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
