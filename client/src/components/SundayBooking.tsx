import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";
import SundayBookingSection from "./SundayBookingCard";
import TimeSetModal from "./TimeSetModal";
import type { SundayBookingResponse } from "@shared/schema";

export default function SundayBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();
  
  // State for time setting modal
  const [timeModalState, setTimeModalState] = useState<{
    isOpen: boolean;
    date: string;
    currentTimeSlot: string | null;
  }>({
    isOpen: false,
    date: "",
    currentTimeSlot: null,
  });

  // Fetch Sunday bookings data (4-6 weeks ahead)
  const { data: sundayBookings = [], isLoading, error } = useQuery<SundayBookingResponse[]>({
    queryKey: ["/api/bookings?type=sunday"],
  });

  // Book slot mutation for Sunday bookings
  const bookSlotMutation = useMutation({
    mutationFn: async ({ date, timeSlot }: { date: string; timeSlot?: string }) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }
      
      const requestData = {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        date,
        isSundayBooking: true,
        ...(timeSlot && { timeSlot }),
      };
      
      return apiRequest("POST", "/api/bookings", requestData);
    },
    onSuccess: () => {
      toast({ 
        title: "Sunday booking successful", 
        description: "Sunday slot booked successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings?type=sunday"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Sunday booking failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async ({ memberId, date }: { memberId: string; date: string }) => {
      return apiRequest("DELETE", `/api/bookings/${memberId}/${date}`);
    },
    onSuccess: () => {
      toast({ 
        title: "Sunday booking cancelled", 
        description: "Your Sunday booking has been cancelled" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings?type=sunday"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Cancellation failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Update time slot mutation
  const updateTimeSlotMutation = useMutation({
    mutationFn: async ({ date, timeSlot }: { date: string; timeSlot: string }) => {
      if (!selectedMemberId) {
        throw new Error("Please select a member");
      }
      
      return apiRequest("PUT", `/api/bookings/${date}/time`, {
        timeSlot,
        memberId: selectedMemberId,
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Time updated", 
        description: "Sunday time slot updated successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings?type=sunday"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setTimeModalState({ isOpen: false, date: "", currentTimeSlot: null });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Time update failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Handle booking slot
  const handleBookSlot = (date: string, timeSlot?: string) => {
    bookSlotMutation.mutate({ date, timeSlot });
  };

  // Handle cancel booking
  const handleCancelBooking = (memberId: string, date: string) => {
    cancelBookingMutation.mutate({ memberId, date });
  };

  // Handle edit time
  const handleEditTime = (date: string, currentTimeSlot: string | null) => {
    setTimeModalState({
      isOpen: true,
      date,
      currentTimeSlot,
    });
  };

  // Handle time modal confirm
  const handleTimeModalConfirm = (timeSlot: string) => {
    if (timeModalState.date) {
      updateTimeSlotMutation.mutate({
        date: timeModalState.date,
        timeSlot,
      });
    }
  };

  // Handle time modal close
  const handleTimeModalClose = () => {
    if (!updateTimeSlotMutation.isPending) {
      setTimeModalState({ isOpen: false, date: "", currentTimeSlot: null });
    }
  };

  // Transform API response to match SundayBookingCard expected format
  const transformedSundayBookings = sundayBookings.map(booking => ({
    date: booking.date,
    timeSlot: booking.timeSlot,
    timeSetBy: booking.timeSetBy,
    timeSetAt: null, // Not needed for display
    participants: (booking.participants || []).map(p => ({
      id: `${p.memberId}-${booking.date}`, // Generate ID for consistency
      memberId: p.memberId,
      memberName: p.memberName,
      date: booking.date,
      isSundayBooking: true,
      timeSlot: booking.timeSlot,
      timeSetBy: booking.timeSetBy,
      timeSetAt: null,
      createdAt: new Date(p.joinedAt),
    })),
    availableSpots: booking.availableSpots,
  }));

  // Show error state if query failed
  if (error) {
    console.error("Sunday bookings query error:", error);
  }

  return (
    <>
      <SundayBookingSection
        sundayBookings={transformedSundayBookings}
        selectedMemberId={selectedMemberId}
        selectedMemberName={selectedMember?.name || ""}
        onBookSlot={handleBookSlot}
        onCancelBooking={handleCancelBooking}
        onEditTime={handleEditTime}
        isBooking={bookSlotMutation.isPending}
        isCancelling={cancelBookingMutation.isPending}
        isOpen={false} // Collapsed by default for de-emphasis
      />

      {/* Time Set Modal */}
      <TimeSetModal
        isOpen={timeModalState.isOpen}
        onClose={handleTimeModalClose}
        onConfirm={handleTimeModalConfirm}
        date={timeModalState.date}
        memberName={selectedMember?.name || ""}
        currentTimeSlot={timeModalState.currentTimeSlot}
        isLoading={updateTimeSlotMutation.isPending}
      />
    </>
  );
}