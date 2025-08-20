import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Member, Booking } from "@shared/schema";
import { format, addDays, startOfWeek, isWeekend, isSameDay } from "date-fns";

interface DayCardProps {
  date: Date;
  bookings: Booking[];
  members: Member[];
  onBookSlot: (date: string) => void;
  isBooking: boolean;
}

function DayCard({ date, bookings, members, onBookSlot, isBooking }: DayCardProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayBookings = bookings.filter(b => b.date === dateStr);
  const isToday = isSameDay(date, new Date());
  const isWeekendDay = isWeekend(date);

  if (isWeekendDay) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4" data-testid={`day-card-${dateStr}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900" data-testid={`date-${dateStr}`}>
            {format(date, "EEE, MMM d")}
          </h4>
          <p className="text-sm text-gray-500" data-testid={`day-label-${dateStr}`}>
            {isToday ? "Today" : format(date, "EEEE")}
          </p>
        </div>
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600" data-testid={`slot-count-${dateStr}`}>
            {dayBookings.length}/6
          </span>
          <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">BOOKED MEMBERS</p>
        {dayBookings.length > 0 ? (
          <div className="flex flex-wrap gap-1" data-testid={`booked-members-${dateStr}`}>
            {dayBookings.map((booking) => (
              <span key={booking.id} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                {booking.memberName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No bookings yet</p>
        )}
      </div>
      
      <Button 
        className="w-full bg-green-100 text-green-700 hover:bg-green-200 font-medium"
        onClick={() => onBookSlot(dateStr)}
        disabled={isBooking || dayBookings.length >= 6}
        data-testid={`button-book-slot-${dateStr}`}
      >
        {dayBookings.length >= 6 ? "Fully Booked" : "Book Slot"}
      </Button>
    </div>
  );
}

export default function BookingCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const bookSlotMutation = useMutation({
    mutationFn: async (date: string) => {
      // For now, we'll use the first member as a placeholder
      // In a real app, you'd have user authentication
      const defaultMember = members[0];
      if (!defaultMember) {
        throw new Error("No members available");
      }

      return apiRequest("POST", "/api/bookings", {
        memberId: defaultMember.id,
        memberName: defaultMember.name,
        date,
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking successful",
        description: "Slot booked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate weekdays for next 2 weeks
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekDays: Date[] = [];

  // Get weekdays from current week and next week
  for (let i = 0; i < 14; i++) {
    const day = addDays(startOfThisWeek, i);
    if (!isWeekend(day)) {
      weekDays.push(day);
    }
  }

  // Group by weeks
  const week1 = weekDays.slice(0, 5);
  const week2 = weekDays.slice(5, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8" data-testid="booking-calendar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">2-Week Booking Window</h2>
          <p className="text-sm text-gray-600">Weekdays only (Monday - Friday)</p>
        </div>
      </div>

      {/* Week 1 */}
      <div className="mb-8">
        <h3 className="text-center text-sm font-medium text-gray-500 mb-6" data-testid="week-1-label">
          Week of {format(week1[0], "MMM d")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {week1.map((date) => (
            <DayCard 
              key={date.toISOString()}
              date={date}
              bookings={bookings}
              members={members}
              onBookSlot={(dateStr) => bookSlotMutation.mutate(dateStr)}
              isBooking={bookSlotMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Week 2 */}
      <div>
        <h3 className="text-center text-sm font-medium text-gray-500 mb-6" data-testid="week-2-label">
          Week of {format(week2[0], "MMM d")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {week2.map((date) => (
            <DayCard 
              key={date.toISOString()}
              date={date}
              bookings={bookings}
              members={members}
              onBookSlot={(dateStr) => bookSlotMutation.mutate(dateStr)}
              isBooking={bookSlotMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
