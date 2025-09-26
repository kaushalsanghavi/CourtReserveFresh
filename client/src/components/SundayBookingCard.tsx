import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import type { SundayBookingGroup } from "@shared/schema";

interface SundayBookingCardProps {
  sundayBooking: SundayBookingGroup;
  selectedMemberId: string;
  onBookSlot: (date: string, timeSlot?: string) => void;
  onCancelBooking: (memberId: string, date: string) => void;
  onEditTime: (date: string, currentTimeSlot: string | null) => void;
  isBooking: boolean;
  isCancelling: boolean;
}

export default function SundayBookingCard({
  sundayBooking,
  selectedMemberId,
  onBookSlot,
  onCancelBooking,
  onEditTime,
  isBooking,
  isCancelling,
}: SundayBookingCardProps) {
  const { date, timeSlot, participants, availableSpots } = sundayBooking;
  
  // Parse date for display
  const dateObj = new Date(date);
  const formattedDate = format(dateObj, "EEE, MMM d");
  
  // Check if selected member has a booking for this date
  const memberBooking = participants.find(p => p.memberId === selectedMemberId);
  const hasSelectedMemberBooking = !!memberBooking;
  
  // Determine card state
  const isEmpty = !timeSlot && participants.length === 0;
  const isFull = availableSpots === 0;
  const isActive = timeSlot && !isFull;
  
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
      // For empty state, we need to show a modal to set time
      onBookSlot(date);
    } else {
      // For active state, book with existing time slot
      onBookSlot(date, timeSlot || undefined);
    }
  };
  
  const handleEditTime = () => {
    onEditTime(date, timeSlot);
  };

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
      data-testid={`sunday-card-${date}`}
    >
      {/* Header with date and participant count */}
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

      {/* Time display or empty state */}
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

      {/* Participants list */}
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

      {/* Action button */}
      <Button
        className={`w-full font-medium ${getButtonStyle()}`}
        onClick={handleButtonClick}
        disabled={isButtonDisabled()}
        data-testid={`sunday-button-${date}`}
      >
        {getButtonText()}
      </Button>
    </div>
  );
}