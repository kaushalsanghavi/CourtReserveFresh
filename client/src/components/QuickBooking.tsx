import { useState, createContext, useContext } from "react";
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

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <SelectedMemberContext.Provider value={{ selectedMemberId, setSelectedMemberId, selectedMember }}>
      {children}
    </SelectedMemberContext.Provider>
  );
};

export default function QuickBooking() {
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
