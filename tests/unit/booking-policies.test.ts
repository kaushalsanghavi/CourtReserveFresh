import { afterEach, describe, expect, it, vi } from "vitest";
import { getMaxCapacityForDate } from "../../shared/booking-capacity";
import {
  isDateOutsideRollingBookingWindow,
  isPastBookingDate,
} from "../../shared/booking-window-policy";
import {
  isSameDayLockedAfterCutoffInIst,
  SAME_DAY_BOOKING_LOCK_MESSAGE,
} from "../../shared/booking-time-policy";
import { validateBookingRequest } from "../../shared/booking-validation";

describe("booking capacity policy", () => {
  it("returns 6 before 2026-03-03 and 5 on/after", () => {
    expect(getMaxCapacityForDate("2026-03-02")).toBe(6);
    expect(getMaxCapacityForDate("2026-03-03")).toBe(5);
    expect(getMaxCapacityForDate("2026-03-20")).toBe(5);
  });
});

describe("IST cutoff policy", () => {
  it("locks only same-day bookings at/after 9:30 AM IST", () => {
    expect(
      isSameDayLockedAfterCutoffInIst(
        "2026-03-02",
        new Date("2026-03-02T09:29:00+05:30"),
      ),
    ).toBe(false);

    expect(
      isSameDayLockedAfterCutoffInIst(
        "2026-03-02",
        new Date("2026-03-02T09:30:00+05:30"),
      ),
    ).toBe(true);

    expect(
      isSameDayLockedAfterCutoffInIst(
        "2026-03-03",
        new Date("2026-03-02T11:00:00+05:30"),
      ),
    ).toBe(false);
  });
});

describe("rolling booking window policy", () => {
  it("flags past dates and outside-window dates correctly", () => {
    const now = new Date("2026-03-02T10:00:00+05:30");

    expect(isPastBookingDate(new Date("2026-03-01T10:00:00+05:30"), now)).toBe(true);
    expect(isPastBookingDate(new Date("2026-03-02T11:00:00+05:30"), now)).toBe(false);

    expect(
      isDateOutsideRollingBookingWindow(new Date("2026-03-29T10:00:00+05:30"), now),
    ).toBe(false);
    expect(
      isDateOutsideRollingBookingWindow(new Date("2026-03-30T10:00:00+05:30"), now),
    ).toBe(true);
  });
});

describe("shared booking validation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks weekend booking dates", async () => {
    const result = await validateBookingRequest({
      date: "2026-03-07",
      memberId: "m1",
      getBookingsByDate: async () => [],
    });

    expect(result).toEqual({
      status: 400,
      message: "Bookings are only allowed on weekdays (Monday-Friday)",
    });
  });

  it("blocks same-day changes after IST cutoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T10:00:00+05:30"));

    const result = await validateBookingRequest({
      date: "2026-03-02",
      memberId: "m1",
      getBookingsByDate: async () => [],
    });

    expect(result).toEqual({
      status: 400,
      message: SAME_DAY_BOOKING_LOCK_MESSAGE,
    });
  });

  it("blocks duplicate booking by member for the same date", async () => {
    const result = await validateBookingRequest({
      date: "2026-03-03",
      memberId: "m1",
      getBookingsByDate: async () => [{ memberId: "m1" }],
    });

    expect(result).toEqual({
      status: 409,
      message: "Member already has a booking for this date",
    });
  });

  it("blocks dates that are already at capacity", async () => {
    const result = await validateBookingRequest({
      date: "2026-03-03",
      memberId: "m7",
      getBookingsByDate: async () => [
        { memberId: "m1" },
        { memberId: "m2" },
        { memberId: "m3" },
        { memberId: "m4" },
        { memberId: "m5" },
      ],
    });

    expect(result).toEqual({
      status: 400,
      message: "This date is fully booked (5/5 slots)",
    });
  });

  it("passes for valid weekday booking requests", async () => {
    const result = await validateBookingRequest({
      date: "2026-03-05",
      memberId: "m7",
      getBookingsByDate: async () => [{ memberId: "m1" }, { memberId: "m2" }],
    });

    expect(result).toBeNull();
  });
});
