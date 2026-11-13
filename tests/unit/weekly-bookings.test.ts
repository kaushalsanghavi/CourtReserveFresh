import { getMonthlyParticipationPercent, getWeekBounds, getWeeklyBadgeLevel, getWeeklyBookingCount, isHeavyWeek } from "@shared/weekly-bookings";

describe("weekly bookings", () => {
  it("uses Monday to Sunday week bounds, across month boundaries", () => {
    expect(getWeekBounds("2026-11-13")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
    expect(getWeekBounds("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-11-01" });
  });

  it("counts distinct booked days for the member in that week only", () => {
    const bookings = [
      { memberId: "a", date: "2026-11-09" },
      { memberId: "a", date: "2026-11-11" },
      { memberId: "a", date: "2026-11-13" },
      { memberId: "a", date: "2026-11-16" },
      { memberId: "a", date: "2026-11-06" },
      { memberId: "b", date: "2026-11-10" },
    ];
    expect(getWeeklyBookingCount(bookings, "a", "2026-11-12")).toBe(3);
    expect(getWeeklyBookingCount(bookings, "b", "2026-11-12")).toBe(1);
    expect(getWeeklyBookingCount(bookings, "c", "2026-11-12")).toBe(0);
  });

  it("flags heavy week only above 3 days", () => {
    expect(isHeavyWeek(3)).toBe(false);
    expect(isHeavyWeek(4)).toBe(true);
  });

  it("computes monthly participation like the monthly tab", () => {
    // Nov 2026 has 21 weekdays
    const bookings = Array.from({ length: 14 }, (_, i) => ({
      memberId: "a",
      date: `2026-11-${String(i + 2).padStart(2, "0")}`,
    })).filter((b) => ![7, 8, 14, 15].includes(Number(b.date.slice(8))));
    expect(getMonthlyParticipationPercent(bookings, "a", "2026-11-13")).toBe(
      Math.round((bookings.length / 21) * 100),
    );
    expect(getMonthlyParticipationPercent(bookings, "b", "2026-11-13")).toBe(0);
  });

  it("escalates heavy weeks above 65% monthly participation", () => {
    expect(getWeeklyBadgeLevel(3, 90)).toBe("normal");
    expect(getWeeklyBadgeLevel(4, 65)).toBe("heavy");
    expect(getWeeklyBadgeLevel(4, 66)).toBe("heavy-high-month");
  });
});
