import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Button } from "@/components/ui/button";
import type { Member, Booking } from "@shared/schema";
import { getFineIncidentDate } from "@shared/fine-policy";
import { getWeekStart, getWeekdays, getWeeklyPlayerCounts, shiftWeek } from "@shared/weekly-participation";

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

export default function WeeklyParticipation() {
  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: allBookings = [] } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });

  // Booking dates are IST calendar days, so "this week" is decided in IST too.
  const currentWeek = getWeekStart(getFineIncidentDate());
  const [weekStart, setWeekStart] = useState(currentWeek);
  const weekdays = getWeekdays(weekStart);

  const rows = useMemo(
    () => getWeeklyPlayerCounts(members, allBookings, weekStart),
    [members, allBookings, weekStart],
  );

  const offset = Math.round((parseISO(weekStart).getTime() - parseISO(currentWeek).getTime()) / (7 * 86400000));
  const weekName =
    offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : null;
  const range = `${format(parseISO(weekdays[0]), "d MMM")} – ${format(parseISO(weekdays[4]), "d MMM")}`;

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="weekly-participation">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Weekly Participation</h2>
          <p className="text-sm text-gray-600">Most days first. Can't get a slot? Ask someone near the top.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            aria-label="Previous week"
            data-testid="weekly-prev"
          >
            <CaretLeftIcon className="h-4 w-4" weight="bold" />
          </Button>
          <div className="min-w-[9.5rem] text-center" data-testid="weekly-label">
            <div className="text-sm font-medium text-gray-900">{weekName ?? `Week of ${format(parseISO(weekStart), "d MMM")}`}</div>
            <div className="text-xs text-gray-500">{range}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
            aria-label="Next week"
            data-testid="weekly-next"
          >
            <CaretRightIcon className="h-4 w-4" weight="bold" />
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-gray-100" data-testid="weekly-player-list">
        {rows.map((row) => (
          <li key={row.member.id} className="flex items-center gap-3 py-3" data-testid={`weekly-row-${row.member.id}`}>
            <div
              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                avatarColors[row.member.avatarColor as keyof typeof avatarColors] || "bg-gray-100 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">{row.member.initials}</span>
            </div>
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{row.member.name}</span>
            <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
              {weekdays.map((day) => {
                const playing = row.bookedDates.includes(day);
                return (
                  <span
                    key={day}
                    className={`inline-flex h-7 w-9 items-center justify-center rounded text-xs font-medium ${
                      playing ? "bg-green-100 text-green-800" : "bg-gray-50 text-gray-300"
                    }`}
                  >
                    {format(parseISO(day), "EEE")}
                  </span>
                );
              })}
            </div>
            <span
              className={`w-16 text-right text-sm tabular-nums ${row.count === 0 ? "text-gray-400" : "font-semibold text-gray-900"}`}
              data-testid={`weekly-count-${row.member.id}`}
            >
              {row.count} {row.count === 1 ? "day" : "days"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
