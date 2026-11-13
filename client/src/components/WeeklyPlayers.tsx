import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Member, Booking } from "@shared/schema";
import { getWeekdays, getWeeklyPlayerCounts } from "@shared/weekly-participation";

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

interface WeeklyPlayersProps {
  weekStart: string;
  members: Member[];
  bookings: Booking[];
  label: string;
  labelTestId?: string;
}

export default function WeeklyPlayers({ weekStart, members, bookings, label, labelTestId }: WeeklyPlayersProps) {
  const weekdays = getWeekdays(weekStart);
  const rows = useMemo(
    () => getWeeklyPlayerCounts(members, bookings, weekStart),
    [members, bookings, weekStart],
  );
  const range = `${format(parseISO(weekdays[0]), "d MMM")} – ${format(parseISO(weekdays[4]), "d MMM")}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          title="See how many days each player is playing this week"
          data-testid={`weekly-players-${weekStart}`}
        >
          <span data-testid={labelTestId}>{label}</span>
          <UsersThreeIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-700" weight="regular" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="weekly-players-dialog">
        <DialogHeader>
          <DialogTitle>Who's playing, {range}</DialogTitle>
          <DialogDescription>Most days first. Can't get a slot? Ask someone near the top.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.member.id} className="flex items-center gap-3 py-2.5" data-testid={`weekly-row-${row.member.id}`}>
              <div
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                  avatarColors[row.member.avatarColor as keyof typeof avatarColors] || "bg-gray-100 text-gray-700"
                }`}
              >
                <span className="text-sm font-medium">{row.member.initials}</span>
              </div>
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{row.member.name}</span>
              <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
                {weekdays.map((day) => (
                  <span
                    key={day}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded text-[11px] font-medium ${
                      row.bookedDates.includes(day) ? "bg-green-100 text-green-800" : "bg-gray-50 text-gray-300"
                    }`}
                  >
                    {format(parseISO(day), "EEEEE")}
                  </span>
                ))}
              </div>
              <span
                className={`w-14 text-right text-sm tabular-nums ${row.count === 0 ? "text-gray-400" : "font-semibold text-gray-900"}`}
                data-testid={`weekly-count-${row.member.id}`}
              >
                {row.count} {row.count === 1 ? "day" : "days"}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
