import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Member, Booking } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

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

type SortField = 'name' | 'participationRate' | 'totalBookings';
type SortDirection = 'asc' | 'desc';

export default function MonthlyParticipation() {
  const [selectedMonth, setSelectedMonth] = useState<string>("8"); // August
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [sortField, setSortField] = useState<SortField>('participationRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const memberStats = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1; // JavaScript months are 0-indexed
    
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdaysInMonth = daysInMonth.filter(day => !isWeekend(day));
    const totalWeekdays = weekdaysInMonth.length;
    
    const stats = members.map(member => {
      const memberBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        return booking.memberId === member.id && 
               bookingDate >= startDate && 
               bookingDate <= endDate;
      });

      const totalBookings = memberBookings.length;
      const participationRate = totalWeekdays > 0 ? Math.round((totalBookings / totalWeekdays) * 100) : 0;
      const status = participationRate >= 50 ? "High" : participationRate >= 25 ? "Medium" : "Low";

      return {
        member,
        totalBookings,
        participationRate,
        status,
      };
    });

    // Sort the stats based on current sort criteria
    return stats.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.member.name.toLowerCase();
          bValue = b.member.name.toLowerCase();
          break;
        case 'participationRate':
          aValue = a.participationRate;
          bValue = b.participationRate;
          break;
        case 'totalBookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [members, allBookings, selectedMonth, selectedYear, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="monthly-participation">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Monthly Participation</h2>
          <p className="text-sm text-gray-600" data-testid="month-year-label">
            {monthNames[parseInt(selectedMonth) - 1]} {selectedYear} booking statistics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-20" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" data-testid="participation-table">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs uppercase tracking-wide"
                  onClick={() => handleSort('name')}
                  data-testid="sort-name"
                >
                  Member
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </th>
              <th className="text-right py-3 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs uppercase tracking-wide"
                  onClick={() => handleSort('totalBookings')}
                  data-testid="sort-bookings"
                >
                  Total Bookings
                  {sortField === 'totalBookings' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </th>
              <th className="text-right py-3 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs uppercase tracking-wide"
                  onClick={() => handleSort('participationRate')}
                  data-testid="sort-rate"
                >
                  Participation Rate
                  {sortField === 'participationRate' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </th>
              <th className="text-center py-3 px-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {memberStats.map((stat) => (
              <tr key={stat.member.id} data-testid={`member-row-${stat.member.id}`}>
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      avatarColors[stat.member.avatarColor as keyof typeof avatarColors] || "bg-gray-100 text-gray-700"
                    }`}>
                      <span className="text-sm font-medium" data-testid={`member-initials-${stat.member.id}`}>
                        {stat.member.initials}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" data-testid={`member-name-${stat.member.id}`}>
                      {stat.member.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-gray-900" data-testid={`total-bookings-${stat.member.id}`}>
                    {stat.totalBookings}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${stat.participationRate}%` }}
                        data-testid={`participation-bar-${stat.member.id}`}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600" data-testid={`participation-percentage-${stat.member.id}`}>
                      {stat.participationRate}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span 
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      stat.status === "High" 
                        ? "bg-green-100 text-green-800"
                        : stat.status === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                    data-testid={`status-${stat.member.id}`}
                  >
                    {stat.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
