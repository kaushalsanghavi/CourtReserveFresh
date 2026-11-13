import { addWeeks, format, parseISO, startOfWeek } from "date-fns";

export const WEEKS_BEFORE_CURRENT = 6;
export const WEEKS_AFTER_CURRENT = 1;

type MemberLike = { id: string; name: string; isActive: boolean };
type BookingLike = { memberId: string; date: string };

export type WeeklyParticipationRow<M extends MemberLike> = {
  member: M;
  counts: number[];
  total: number;
  average: number;
  difference: number;
};

export function getWeekStart(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function getWeekStarts(
  today: string,
  before: number = WEEKS_BEFORE_CURRENT,
  after: number = WEEKS_AFTER_CURRENT,
): string[] {
  const current = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  const weeks: string[] = [];
  for (let offset = -before; offset <= after; offset++) {
    weeks.push(format(addWeeks(current, offset), "yyyy-MM-dd"));
  }
  return weeks;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildWeeklyParticipation<M extends MemberLike>(
  members: M[],
  bookings: BookingLike[],
  weekStarts: string[],
): { rows: WeeklyParticipationRow<M>[]; groupAverage: number } {
  const weekIndex = new Map(weekStarts.map((week, index) => [week, index]));
  const countsByMember = new Map<string, number[]>();

  for (const booking of bookings) {
    const index = weekIndex.get(getWeekStart(booking.date));
    if (index === undefined) continue;
    const counts = countsByMember.get(booking.memberId) ?? weekStarts.map(() => 0);
    counts[index]++;
    countsByMember.set(booking.memberId, counts);
  }

  const partial = members.flatMap((member) => {
    const counts = countsByMember.get(member.id) ?? weekStarts.map(() => 0);
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (!member.isActive && total === 0) return [];
    return [{ member, counts, total, average: weekStarts.length ? total / weekStarts.length : 0 }];
  });

  const groupAverage = partial.length
    ? partial.reduce((sum, row) => sum + row.average, 0) / partial.length
    : 0;

  const rows = partial
    .map((row) => ({
      ...row,
      average: round1(row.average),
      difference: round1(row.average - groupAverage),
    }))
    .sort((a, b) => b.total - a.total || a.member.name.localeCompare(b.member.name));

  return { rows, groupAverage: round1(groupAverage) };
}
