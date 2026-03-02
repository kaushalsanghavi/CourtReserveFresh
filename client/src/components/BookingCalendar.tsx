import { useRef, useState } from "react";
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
import { getMaxCapacityForDate } from "@shared/booking-capacity";
import {
  isSameDayLockedAfterCutoffInIst,
  SAME_DAY_BOOKING_LOCK_MESSAGE,
} from "@shared/booking-time-policy";
import { format, parseISO, addDays, startOfWeek, isWeekend, isSameDay, isBefore, startOfDay, isAfter } from "date-fns";

interface DayCardProps {
  date: Date;
  bookings: Booking[];
  members: Member[];
  onBookSlot: (date: string) => void;
  onCancelBooking: (memberId: string, date: string) => void;
  isBooking: boolean;
  isCancelling: boolean;
  isBookLocked: boolean;
  selectedMemberId: string;
}

function DayCard({ date, bookings, members, onBookSlot, onCancelBooking, isBooking, isCancelling, isBookLocked, selectedMemberId }: DayCardProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayBookings = bookings.filter(b => b.date === dateStr);
  const maxSlots = getMaxCapacityForDate(dateStr);
  const isToday = isSameDay(date, new Date());
  const isWeekendDay = isWeekend(date);

  // Allow booking anytime, but only within a rolling 4-week window.
  const now = new Date();
  const bookingWindowEnd = addDays(startOfDay(now), 27);
  const isPastDate = isBefore(startOfDay(date), startOfDay(now));
  const isBeyondWindow = isAfter(startOfDay(date), bookingWindowEnd);
  const isSameDayLocked = isSameDayLockedAfterCutoffInIst(dateStr);
  const isBookingDisabled = isPastDate || isBeyondWindow || isSameDayLocked;

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
    if (isBooking || isCancelling || isBookLocked) {
      return hasSelectedMemberBooking ? "Cancelling..." : "Booking...";
    }
    if (isBookingDisabled && !hasSelectedMemberBooking) {
      if (isPastDate) return "Past Date";
      if (isBeyondWindow) return "Outside Window";
      if (isSameDayLocked) return "Closed";
    }
    if (dayBookings.length >= maxSlots && !hasSelectedMemberBooking) {
      return "Fully Booked";
    }
    if (hasSelectedMemberBooking) {
      if (isSameDayLocked) return "Closed";
      return isBookingDisabled ? "Booked (Past)" : "Cancel Booking";
    }
    return "Book Slot";
  };

  const isButtonDisabled = () => {
    if (!selectedMemberId) return true;
    if (isBooking || isCancelling || isBookLocked) return true;
    if (dayBookings.length >= maxSlots && !hasSelectedMemberBooking) return true;
    // Disable booking for dates outside the active booking window.
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
            {isToday ? (isSameDayLocked ? "Today (Closed)" : "Today") : 
             isPastDate ? "Past" : 
             format(date, "EEEE")}
          </p>
        </div>
        <div className="flex items-center">
          <span className={`text-sm font-medium ${
            isBookingDisabled ? "text-gray-500" : "text-gray-600"
          }`} data-testid={`slot-count-${dateStr}`}>
            {dayBookings.length}/{maxSlots}
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
        data-testid={`button-book-slot-${dateStr}`}>
        {getButtonText()}
      </Button>
      
      <div className="mt-3 flex gap-3">
        <CommentsAlternative date={dateStr} variant="sheet" />
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex-1 flex items-center justify-center bg-transparent border-transparent hover:bg-gray-50 rounded-lg aspect-square h-12"
              data-testid={`booking-history-btn-${dateStr}`}>
              <History className="w-5 h-5 text-gray-400" />
            </button>
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
  const bookingLockRef = useRef<Set<string>>(new Set());
  const [bookingLocks, setBookingLocks] = useState<Record<string, true>>({});

  const { data: members = [] } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: bookings = [] } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });

  const isAlreadyBookedConflict = (error: Error) => {
    const message = error.message || "";
    return (
      message.startsWith("409:") &&
      message.toLowerCase().includes("already has a booking")
    );
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const bookSlotMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }
      return apiRequest("POST", "/api/bookings", { memberId: selectedMemberId, memberName: selectedMember.name, date });
    },
    onSuccess: () => {
      toast({ title: "Booking successful", description: "Slot booked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error, date: string) => {
      if (error.message.includes(SAME_DAY_BOOKING_LOCK_MESSAGE)) {
        toast({
          title: "Booking closed",
          description: "Changes for today are closed after 9:30 AM IST.",
        });
        return;
      }
      if (isAlreadyBookedConflict(error)) {
        toast({
          title: "Already booked",
          description: `You're all set for ${formatShortDate(date)}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
        return;
      }
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const lockBookingKey = (key: string) => {
    bookingLockRef.current.add(key);
    setBookingLocks((prev) => ({ ...prev, [key]: true }));
  };

  const unlockBookingKey = (key: string) => {
    bookingLockRef.current.delete(key);
    setBookingLocks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleBookSlot = (dateStr: string) => {
    if (!selectedMemberId) return;
    const bookingKey = `${selectedMemberId}:${dateStr}`;
    if (bookingLockRef.current.has(bookingKey)) return;

    lockBookingKey(bookingKey);
    bookSlotMutation.mutate(dateStr, {
      onSettled: () => {
        unlockBookingKey(bookingKey);
      },
    });
  };

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ memberId, date }: { memberId: string; date: string }) => {
      return apiRequest("DELETE", `/api/bookings/${memberId}/${date}`, {});
    },
    onSuccess: () => {
      toast({ title: "Booking cancelled", description: "Your booking has been cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error) => {
      if (error.message.includes(SAME_DAY_BOOKING_LOCK_MESSAGE)) {
        toast({
          title: "Booking closed",
          description: "Changes for today are closed after 9:30 AM IST.",
        });
        return;
      }
      toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
    },
  });

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays: Date[] = [];

  for (let i = 0; i < 28; i++) {
    const day = addDays(startOfThisWeek, i);
    if (!isWeekend(day)) {
      weekDays.push(day);
    }
  }

  const weeks = [
    weekDays.slice(0, 5),
    weekDays.slice(5, 10),
    weekDays.slice(10, 15),
    weekDays.slice(15, 20),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8" data-testid="booking-calendar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Booking Window</h2>
          <p className="text-sm text-gray-600">Weekdays only (Monday - Friday), next 4 weeks</p>
        </div>
      </div>

      {weeks.map((week, index) => (
        <div key={`week-${index}`} className={index < weeks.length - 1 ? "mb-8" : ""}>
          <h3 className="text-center text-sm font-medium text-gray-500 mb-6" data-testid={`week-${index + 1}-label`}>
            Week of {format(week[0], "MMM d")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {week.map((date) => (
              <DayCard
                key={date.toISOString()}
                date={date}
                bookings={bookings}
                members={members}
                onBookSlot={handleBookSlot}
                onCancelBooking={(memberId, bookingDate) => cancelBookingMutation.mutate({ memberId, date: bookingDate })}
                isBooking={bookSlotMutation.isPending}
                isCancelling={cancelBookingMutation.isPending}
                isBookLocked={!!bookingLocks[`${selectedMemberId}:${format(date, "yyyy-MM-dd")}`]}
                selectedMemberId={selectedMemberId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
