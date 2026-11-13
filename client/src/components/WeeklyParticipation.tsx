import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import type { Member, Booking } from "@shared/schema";
import { getFineIncidentDate } from "@shared/fine-policy";
import { buildWeeklyParticipation, getWeekStart, getWeekStarts } from "@shared/weekly-participation";

const avatarColors = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
  pink: "bg-pink-100 text-pink-700",
  indigo: "bg-indigo-100 text-indigo-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  teal: "bg-teal-100 text-teal-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

function cellTone(count: number): string {
  if (count === 0) return "text-gray-300";
  if (count === 1) return "bg-green-50 text-green-800";
  if (count === 2) return "bg-green-100 text-green-800";
  if (count === 3) return "bg-green-200 text-green-900";
  return "bg-green-300 text-green-900";
}

function formatDifference(difference: number): string {
  if (difference === 0) return "On par";
  return `${difference > 0 ? "+" : ""}${difference.toFixed(1)}`;
}

export default function WeeklyParticipation() {
  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: allBookings = [] } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });

  // Booking dates are IST calendar days, so "this week" is decided in IST too.
  const today = getFineIncidentDate();
  const currentWeek = getWeekStart(today);
  const weekStarts = useMemo(() => getWeekStarts(today), [today]);

  const { rows, groupAverage } = useMemo(
    () => buildWeeklyParticipation(members, allBookings, weekStarts),
    [members, allBookings, weekStarts],
  );

  const weekLabel = (week: string) => {
    if (week === currentWeek) return "This week";
    if (week > currentWeek) return "Next week";
    return format(parseISO(week), "MMM d");
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="weekly-participation">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Weekly Participation</h2>
        <p className="text-sm text-gray-600">
          Bookings per week, most active first. The group averages{" "}
          <span className="font-medium text-gray-900" data-testid="weekly-group-average">
            {groupAverage.toFixed(1)}
          </span>{" "}
          a week, so anyone well above it can hand a slot to someone below it.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="weekly-participation-table">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <th className="sticky left-0 bg-white text-left py-3 pr-3">Member</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">Avg / week</th>
              <th className="py-3 px-2 text-center whitespace-nowrap">vs group</th>
              {weekStarts.map((week) => (
                <th
                  key={week}
                  className={`py-3 px-2 text-center whitespace-nowrap ${week === currentWeek ? "text-green-700" : ""}`}
                  title={`Week of ${format(parseISO(week), "d MMM yyyy")}`}
                >
                  {weekLabel(week)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.member.id} data-testid={`weekly-row-${row.member.id}`}>
                <td className="sticky left-0 bg-white py-3 pr-3">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center mr-3 ${
                        avatarColors[row.member.avatarColor as keyof typeof avatarColors] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <span className="text-sm font-medium">{row.member.initials}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{row.member.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-sm text-gray-900 tabular-nums" data-testid={`weekly-average-${row.member.id}`}>
                  {row.average.toFixed(1)}
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded tabular-nums whitespace-nowrap ${
                      row.difference >= 0.5
                        ? "bg-amber-100 text-amber-800"
                        : row.difference <= -0.5
                          ? "bg-sky-100 text-sky-800"
                          : "bg-gray-100 text-gray-700"
                    }`}
                    data-testid={`weekly-difference-${row.member.id}`}
                  >
                    {formatDifference(row.difference)}
                  </span>
                </td>
                {row.counts.map((count, index) => (
                  <td key={weekStarts[index]} className="py-3 px-2 text-center">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded text-sm tabular-nums ${cellTone(count)} ${
                        weekStarts[index] > currentWeek ? "opacity-60" : ""
                      }`}
                      data-testid={`weekly-count-${row.member.id}-${weekStarts[index]}`}
                    >
                      {count}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
