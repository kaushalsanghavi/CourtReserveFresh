import { useState } from "react";
import { Pencil, ChevronDown, MessageCircle, History } from "lucide-react";
import { format } from "date-fns";
import FirstBookingForm from "./FirstBookingForm";
import CommentsAlternative from "./CommentsAlternative";
import BookingHistory from "./BookingHistory";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SundayBookingGroup } from "@shared/schema";

interface SundayBookingCardProps {
  sundayBooking: SundayBookingGroup;
  selectedMemberId: string;
  selectedMemberName: string;
  onBookSlot: (date: string, timeSlot?: string) => void;
  onCancelBooking: (memberId: string, date: string) => void;
  onEditTime: (date: string, currentTimeSlot: string | null) => void;
  isBooking: boolean;
  isCancelling: boolean;
}

interface SundayBookingSectionProps {
  sundayBookings: SundayBookingGroup[];
  selectedMemberId: string;
  selectedMemberName: string;
  onBookSlot: (date: string, timeSlot?: string) => void;
  onCancelBooking: (memberId: string, date: string) => void;
  onEditTime: (date: string, currentTimeSlot: string | null) => void;
  isBooking: boolean;
  isCancelling: boolean;
  isOpen?: boolean;
}

function SundayBookingCard({
  sundayBooking,
  selectedMemberId,
  selectedMemberName,
  onBookSlot,
  onCancelBooking,
  onEditTime,
  isBooking,
  isCancelling,
}: SundayBookingCardProps) {
  const { date, timeSlot, participants, availableSpots } = sundayBooking;
  const [showFirstBookingForm, setShowFirstBookingForm] = useState(false);
  
  // Parse date for display - matching the mockup format
  const dateObj = new Date(date);
  const formattedDate = format(dateObj, "EEE, MMM d");
  
  // Check if selected member has a booking for this date
  const memberBooking = participants.find(p => p.memberId === selectedMemberId);
  const hasSelectedMemberBooking = !!memberBooking;
  
  // Determine card state
  const isEmpty = !timeSlot && participants.length === 0;
  const isFull = availableSpots === 0;
  
  // Button logic
  const getButtonText = () => {
    if (isBooking || isCancelling) {
      return hasSelectedMemberBooking ? "Cancelling..." : "Booking...";
    }
    
    if (isEmpty) {
      return "Book & Set Time";
    }
    
    if (isFull && !hasSelectedMemberBooking) {
      return "Fully Booked";
    }
    
    if (hasSelectedMemberBooking) {
      return "Cancel Booking";
    }
    
    return "Book Slot";
  };
  
  const getButtonStyle = () => {
    if (isButtonDisabled()) {
      return "bg-gray-100 text-gray-500 cursor-not-allowed";
    }
    
    if (hasSelectedMemberBooking) {
      return "bg-red-100 text-red-700 hover:bg-red-200";
    }
    
    return "bg-green-100 text-green-700 hover:bg-green-200";
  };
  
  const isButtonDisabled = () => {
    if (!selectedMemberId) return true;
    if (isBooking || isCancelling) return true;
    if (isFull && !hasSelectedMemberBooking) return true;
    return false;
  };
  
  const handleButtonClick = () => {
    if (hasSelectedMemberBooking) {
      onCancelBooking(selectedMemberId, date);
    } else if (isEmpty) {
      // For empty state, show inline form to set time
      setShowFirstBookingForm(true);
    } else {
      // For active state, book with existing time slot
      onBookSlot(date, timeSlot || undefined);
    }
  };

  const handleFirstBookingConfirm = (timeSlot: string) => {
    onBookSlot(date, timeSlot);
    setShowFirstBookingForm(false);
  };

  const handleFirstBookingCancel = () => {
    setShowFirstBookingForm(false);
  };
  
  const handleEditTime = () => {
    onEditTime(date, timeSlot);
  };

  // Show first booking form if user clicked "Book & Set Time"
  if (showFirstBookingForm) {
    return (
      <FirstBookingForm
        date={date}
        memberName={selectedMemberName}
        onConfirm={handleFirstBookingConfirm}
        onCancel={handleFirstBookingCancel}
        isLoading={isBooking}
      />
    );
  }

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
      data-testid={`sunday-card-${date}`}
    >
      {/* Header with date and participant count - matching mockup */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900" data-testid={`sunday-date-${date}`}>
          {formattedDate}
        </h4>
        {!isEmpty && (
          <span 
            className="text-sm font-medium text-gray-600"
            data-testid={`sunday-count-${date}`}
          >
            {participants.length}/6
          </span>
        )}
      </div>

      {/* Time display or empty state - matching mockup exactly */}
      {isEmpty ? (
        <div className="text-center p-4 bg-gray-50 rounded-md">
          <p className="font-medium text-gray-700">No Time Set</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
          <p 
            className="text-sm font-medium text-gray-800"
            data-testid={`sunday-time-${date}`}
          >
            {timeSlot}
          </p>
          <button
            onClick={handleEditTime}
            className="text-gray-500 hover:text-gray-800 p-1 rounded"
            data-testid={`sunday-edit-time-${date}`}
            aria-label="Edit time slot"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Participants list - matching mockup style */}
      {!isEmpty && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            PLAYERS
          </p>
          {participants.length > 0 ? (
            <div 
              className="flex flex-wrap gap-1"
              data-testid={`sunday-participants-${date}`}
            >
              {participants.map((participant) => (
                <span
                  key={participant.memberId}
                  className={`px-2 py-1 text-xs rounded ${
                    participant.memberId === selectedMemberId
                      ? "bg-green-100 text-green-700 font-medium"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {participant.memberName}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No bookings yet</p>
          )}
        </div>
      )}

      {/* Action button - matching mockup colors */}
      <button
        className={`w-full font-medium py-2 rounded-lg transition-colors ${getButtonStyle()}`}
        onClick={handleButtonClick}
        disabled={isButtonDisabled()}
        data-testid={`sunday-button-${date}`}
      >
        {getButtonText()}
      </button>
      
      {/* Comments & History Actions - identical to weekday cards */}
      <div className="flex gap-3">
        <CommentsAlternative date={date} variant="sheet" />
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex-1 flex items-center justify-center bg-transparent border-transparent hover:bg-gray-50 rounded-lg aspect-square h-12"
              data-testid={`sunday-booking-history-btn-${date}`}>
              <History className="w-5 h-5 text-gray-400" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:w-[540px] overflow-y-auto">
            <BookingHistory date={date} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// Main collapsible Sunday booking section component - matching the approved mockup
export default function SundayBookingSection({
  sundayBookings,
  selectedMemberId,
  selectedMemberName,
  onBookSlot,
  onCancelBooking,
  onEditTime,
  isBooking,
  isCancelling,
  isOpen = true,
}: SundayBookingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(isOpen);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <details 
        className="bg-gray-50 rounded-lg border" 
        open={isExpanded}
        onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="p-4 cursor-pointer flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-lg font-medium text-gray-800">
            Ad-hoc Sunday Bookings (Members Only)
          </h3>
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </summary>
        
        <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sundayBookings.map((sundayBooking) => (
            <SundayBookingCard
              key={sundayBooking.date}
              sundayBooking={sundayBooking}
              selectedMemberId={selectedMemberId}
              selectedMemberName={selectedMemberName}
              onBookSlot={onBookSlot}
              onCancelBooking={onCancelBooking}
              onEditTime={onEditTime}
              isBooking={isBooking}
              isCancelling={isCancelling}
            />
          ))}
          
          {sundayBookings.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>No upcoming Sunday bookings available</p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

// Export both components for flexibility
export { SundayBookingCard };