import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Member } from "@shared/schema";
import { format } from "date-fns";

export default function QuickBooking() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const quickBookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId) {
        throw new Error("Please select a member");
      }

      const selectedMember = members.find(m => m.id === selectedMemberId);
      if (!selectedMember) {
        throw new Error("Member not found");
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = new Date().getDay();
      
      // Check if today is a weekday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new Error("Bookings are only allowed on weekdays");
      }

      return apiRequest("POST", "/api/bookings", {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        date: today,
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking successful",
        description: "Slot booked for today",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setSelectedMemberId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8" data-testid="quick-booking-card">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Quick Booking</h2>
      <p className="text-sm text-gray-600 mb-4">Select your name to book or cancel slots</p>
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger data-testid="select-member">
              <SelectValue placeholder="Select member..." />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => quickBookMutation.mutate()}
          disabled={quickBookMutation.isPending || !selectedMemberId}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-quick-book"
        >
          {quickBookMutation.isPending ? "Booking..." : "Quick Book"}
        </Button>
      </div>
    </div>
  );
}
