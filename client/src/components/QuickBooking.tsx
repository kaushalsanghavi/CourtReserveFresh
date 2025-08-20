
import { useState, createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Member } from "@shared/schema";

interface SelectedMemberContextType {
  selectedMemberId: string;
  setSelectedMemberId: (memberId: string) => void;
  selectedMember: Member | undefined;
}

const SelectedMemberContext = createContext<SelectedMemberContextType | undefined>(undefined);

export const useSelectedMember = () => {
  const context = useContext(SelectedMemberContext);
  if (!context) {
    throw new Error("useSelectedMember must be used within SelectedMemberProvider");
  }
  return context;
};

export const SelectedMemberProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  // Load last selected member from cookie on component mount
  useEffect(() => {
    const lastSelectedMember = document.cookie
      .split('; ')
      .find(row => row.startsWith('lastSelectedMember='))
      ?.split('=')[1];
    
    if (lastSelectedMember && members.length > 0) {
      // Verify the member still exists in the current member list
      const memberExists = members.find(m => m.id === lastSelectedMember);
      if (memberExists) {
        setSelectedMemberId(lastSelectedMember);
      }
    }
  }, [members]);

  // Save selected member to cookie whenever it changes
  const handleSetSelectedMemberId = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (memberId) {
      // Set cookie to expire in 30 days
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      document.cookie = `lastSelectedMember=${memberId}; expires=${expirationDate.toUTCString()}; path=/`;
    } else {
      // Clear cookie if no member selected
      document.cookie = 'lastSelectedMember=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <SelectedMemberContext.Provider value={{ selectedMemberId, setSelectedMemberId: handleSetSelectedMemberId, selectedMember }}>
      {children}
    </SelectedMemberContext.Provider>
  );
};

// Internal component that uses the context
function QuickBookingContent() {
  const { selectedMemberId, setSelectedMemberId } = useSelectedMember();
  
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
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
        {selectedMemberId && (
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium text-gray-900">{members.find(m => m.id === selectedMemberId)?.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the wrapper component that doesn't need context
export default function QuickBooking() {
  return <QuickBookingContent />;
}
