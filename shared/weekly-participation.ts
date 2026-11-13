import { addDays, format, parseISO, startOfWeek } from "date-fns";

type MemberLike = { id: string; name: string; isActive: boolean };
type BookingLike = { memberId: string; date: string };

export type WeeklyPlayerCount<M extends MemberLike> = {
  member: M;
  bookedDates: string[];
  count: number;
};

export function getWeekStart(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function shiftWeek(weekStart: string, weeks: number): string {
  return format(addDays(parseISO(weekStart), weeks * 7), "yyyy-MM-dd");
}

export function getWeekdays(weekStart: string): string[] {
  return [0, 1, 2, 3, 4].map((offset) => format(addDays(parseISO(weekStart), offset), "yyyy-MM-dd"));
}

export function getWeeklyPlayerCounts<M extends MemberLike>(
  members: M[],
  bookings: BookingLike[],
  weekStart: string,
): WeeklyPlayerCount<M>[] {
  const weekEnd = shiftWeek(weekStart, 1);
  const datesByMember = new Map<string, Set<string>>();

  for (const booking of bookings) {
    if (booking.date < weekStart || booking.date >= weekEnd) continue;
    const dates = datesByMember.get(booking.memberId) ?? new Set<string>();
    dates.add(booking.date);
    datesByMember.set(booking.memberId, dates);
  }

  return members
    .flatMap((member) => {
      const bookedDates = Array.from(datesByMember.get(member.id) ?? []).sort();
      if (!member.isActive && bookedDates.length === 0) return [];
      return [{ member, bookedDates, count: bookedDates.length }];
    })
    .sort((a, b) => b.count - a.count || a.member.name.localeCompare(b.member.name));
}
