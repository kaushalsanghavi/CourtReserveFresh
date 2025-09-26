import SundayBookingCard from "../SundayBookingCard";
import type { SundayBookingGroup } from "@shared/schema";

// Demo data for different states
const emptyState: SundayBookingGroup = {
  date: "2025-01-12",
  timeSlot: null,
  timeSetBy: null,
  timeSetAt: null,
  participants: [],
  availableSpots: 6,
};

const activeState: SundayBookingGroup = {
  date: "2025-01-19",
  timeSlot: "8:00 AM - 9:00 AM",
  timeSetBy: "member-2",
  timeSetAt: new Date(),
  participants: [
    {
      id: "booking-1",
      memberId: "member-2",
      memberName: "John S.",
      date: "2025-01-19",
      isSundayBooking: true,
      timeSlot: "8:00 AM - 9:00 AM",
      timeSetBy: "member-2",
      timeSetAt: new Date(),
      createdAt: new Date(),
    },
  ],
  availableSpots: 5,
};

const fullState: SundayBookingGroup = {
  date: "2025-01-26",
  timeSlot: "10:00 AM - 11:00 AM",
  timeSetBy: "member-1",
  timeSetAt: new Date(),
  participants: Array.from({ length: 6 }, (_, i) => ({
    id: `booking-${i + 1}`,
    memberId: `member-${i + 1}`,
    memberName: `Player ${i + 1}`,
    date: "2025-01-26",
    isSundayBooking: true,
    timeSlot: "10:00 AM - 11:00 AM",
    timeSetBy: "member-1",
    timeSetAt: new Date(),
    createdAt: new Date(),
  })),
  availableSpots: 0,
};

// Demo component to showcase all states
export default function SundayBookingCardDemo() {
  const mockProps = {
    selectedMemberId: "member-1",
    onBookSlot: (date: string, timeSlot?: string) => {
      console.log("Book slot:", date, timeSlot);
    },
    onCancelBooking: (memberId: string, date: string) => {
      console.log("Cancel booking:", memberId, date);
    },
    onEditTime: (date: string, currentTimeSlot: string | null) => {
      console.log("Edit time:", date, currentTimeSlot);
    },
    isBooking: false,
    isCancelling: false,
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">SundayBookingCard Component Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
        <div>
          <h2 className="text-lg font-semibold mb-4">Empty State</h2>
          <SundayBookingCard
            sundayBooking={emptyState}
            {...mockProps}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Active State</h2>
          <SundayBookingCard
            sundayBooking={activeState}
            {...mockProps}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Full State</h2>
          <SundayBookingCard
            sundayBooking={fullState}
            {...mockProps}
          />
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">User Has Booking (Cancel State)</h2>
        <div className="max-w-sm">
          <SundayBookingCard
            sundayBooking={{
              ...activeState,
              participants: [
                {
                  id: "booking-1",
                  memberId: "member-1", // Same as selectedMemberId
                  memberName: "Current User",
                  date: "2025-01-19",
                  isSundayBooking: true,
                  timeSlot: "8:00 AM - 9:00 AM",
                  timeSetBy: "member-1",
                  timeSetAt: new Date(),
                  createdAt: new Date(),
                },
              ],
            }}
            {...mockProps}
          />
        </div>
      </div>
    </div>
  );
}