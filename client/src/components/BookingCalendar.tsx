import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";
import CommentsAlternative from "./CommentsAlternative";
import BookingHistory from "./BookingHistory";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { History } from "lucide-react";
import type { Member, Booking, Comment } from "@shared/schema";
import { format, addDays, startOfWeek, isWeekend, isSameDay, isBefore, startOfDay, setHours, setMinutes } from "date-fns";

interface DayCardProps {
  date: Date;
  bookings: Booking[];
  members: Member[];
  onBookSlot: (date: string) => void;
  onCancelBooking: (memberId: string, date: string) => void;
  isBooking: boolean;
  isCancelling: boolean;
  selectedMemberId: string;
}

function DayCard({ date, bookings, members, onBookSlot, onCancelBooking, isBooking, isCancelling, selectedMemberId }: DayCardProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayBookings = bookings.filter(b => b.date === dateStr);
  const isToday = isSameDay(date, new Date());
  const isWeekendDay = isWeekend(date);

  // Check if date is in the past or today after 9:30 AM
  const now = new Date();
  const cutoffTime = setMinutes(setHours(new Date(), 9), 30); // 9:30 AM today
  const isPastDate = isBefore(startOfDay(date), startOfDay(now));
  const isTodayAfterCutoff = isToday && now >= cutoffTime;
  const isBookingDisabled = isPastDate || isTodayAfterCutoff;

  // Check if selected member has a booking for this date
  const memberBooking = dayBookings.find(b => b.memberId === selectedMemberId);
  const hasSelectedMemberBooking = !!memberBooking;

  if (isWeekendDay) return null;

  const handleButtonClick = () => {
    if (hasSelectedMemberBooking) {
      onCancelBooking(selectedMemberId, dateStr);
    } else {
      onBookSlot(dateStr);
    }
  };

  const getButtonText = () => {
    if (isBooking || isCancelling) {
      return hasSelectedMemberBooking ? "Cancelling..." : "Booking...";
    }
    if (isBookingDisabled && !hasSelectedMemberBooking) {
      if (isPastDate) return "Past Date";
      if (isTodayAfterCutoff) return "Booking Closed";
    }
    if (dayBookings.length >= 6 && !hasSelectedMemberBooking) {
      return "Fully Booked";
    }
    if (hasSelectedMemberBooking) {
      return isBookingDisabled ? "Booked (Past)" : "Cancel Booking";
    }
    return "Book Slot";
  };

  const isButtonDisabled = () => {
    if (!selectedMemberId) return true;
    if (isBooking || isCancelling) return true;
    if (dayBookings.length >= 6 && !hasSelectedMemberBooking) return true;
    // Disable booking for past dates or today after 9:30 AM (but allow cancellation)
    if (isBookingDisabled && !hasSelectedMemberBooking) return true;
    // Allow cancellation even for past bookings, but disable new bookings
    if (isBookingDisabled && hasSelectedMemberBooking) return true;
    return false;
  };

  return (
    <div className={`border rounded-lg p-4 ${
      isBookingDisabled 
        ? "border-gray-300 bg-gray-50" 
        : "border-gray-200 bg-white"
    }`} data-testid={`day-card-${dateStr}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-medium ${
            isBookingDisabled ? "text-gray-500" : "text-gray-900"
          }`} data-testid={`date-${dateStr}`}>
            {format(date, "EEE, MMM d")}
          </h4>
          <p className="text-sm text-gray-500" data-testid={`day-label-${dateStr}`}>
            {isToday ? (isTodayAfterCutoff ? "Today (Closed)" : "Today") : 
             isPastDate ? "Past" : 
             format(date, "EEEE")}
          </p>
        </div>
        <div className="flex items-center">
          <span className={`text-sm font-medium ${
            isBookingDisabled ? "text-gray-500" : "text-gray-600"
          }`} data-testid={`slot-count-${dateStr}`}>
            {dayBookings.length}/6
          </span>
          <div className={`w-2 h-2 rounded-full ml-2 ${
            isBookingDisabled ? "bg-gray-400" : "bg-green-500"
          }`}></div>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">BOOKED MEMBERS</p>
        {dayBookings.length > 0 ? (
          <div className="flex flex-wrap gap-1" data-testid={`booked-members-${dateStr}`}>
            {dayBookings.map((booking) => (
              <span 
                key={booking.id} 
                className={`px-2 py-1 text-xs rounded ${
                  booking.memberId === selectedMemberId 
                    ? "bg-green-100 text-green-700 font-medium" 
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {booking.memberName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No bookings yet</p>
        )}
      </div>
      
      <Button 
        className={`w-full font-medium ${
          isButtonDisabled() 
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : hasSelectedMemberBooking
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
        }`}
        onClick={handleButtonClick}
        disabled={isButtonDisabled()}
        data-testid={`button-book-slot-${dateStr}`}
      >
        {getButtonText()}
      </Button>
      
      <div className="mt-3 flex gap-2">
        <CommentsAlternative date={dateStr} variant="sheet" />
        
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 flex items-center gap-2 text-xs"
              data-testid={`booking-history-btn-${dateStr}`}
            >
              <History className="w-3 h-3" />
              {/* Icon only */}
              
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:w-[540px] overflow-y-auto">
            <BookingHistory date={dateStr} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default function BookingCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const bookSlotMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }

      return apiRequest("POST", "/api/bookings", {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
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

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ memberId, date }: { memberId: string; date: string }) => {
      return apiRequest("DELETE", `/api/bookings/${memberId}/${date}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
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
        {!selectedMemberId && (
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md">
            Select a member above to book or cancel slots
          </div>
        )}
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
              onCancelBooking={(memberId, date) => cancelBookingMutation.mutate({ memberId, date })}
              isBooking={bookSlotMutation.isPending}
              isCancelling={cancelBookingMutation.isPending}
              selectedMemberId={selectedMemberId}
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
              onCancelBooking={(memberId, date) => cancelBookingMutation.mutate({ memberId, date })}
              isBooking={bookSlotMutation.isPending}
              isCancelling={cancelBookingMutation.isPending}
              selectedMemberId={selectedMemberId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
