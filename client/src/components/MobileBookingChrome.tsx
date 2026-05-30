import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { triggerHaptic } from "@/lib/haptics";
import { useSelectedMember } from "./QuickBooking";
import type { Member } from "@shared/schema";

const ACTIVE_MEMBERS_QUERY = "/api/members?status=active";

interface MobileBookingChromeProps {
  activeTab: "recent-activity" | "monthly-participation" | "ai-chat";
  onTabChange: (tab: "recent-activity" | "monthly-participation" | "ai-chat") => void;
}

export default function MobileBookingChrome({ activeTab, onTabChange }: MobileBookingChromeProps) {
  const { selectedMemberId, selectedMember, setSelectedMemberId } = useSelectedMember();
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: [ACTIVE_MEMBERS_QUERY],
  });
  const [isCompressed, setIsCompressed] = useState(false);
  const [isMemberEditorOpen, setIsMemberEditorOpen] = useState(false);
  const memberTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsCompressed(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    triggerHaptic("selection");
    setIsMemberEditorOpen(false);
  };

  const toggleMemberEditor = () => {
    setIsMemberEditorOpen((current) => {
      const next = !current;
      if (next) {
        requestAnimationFrame(() => memberTriggerRef.current?.focus());
      }
      return next;
    });
    triggerHaptic("selection");
  };

  return (
    <section
      className={`sticky top-0 z-30 -mx-4 mb-4 border-b border-gray-200 bg-white/95 backdrop-blur md:hidden ${
        isCompressed ? "shadow-sm" : ""
      }`}
    >
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={`font-semibold text-gray-900 transition-all ${
                isCompressed ? "text-base leading-5" : "text-lg leading-6"
              }`}
              data-testid="app-title-mobile"
            >
              Our own slot bookings for Badminton
            </h1>
            {!isCompressed && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Group Scheduler @ Sunny</span>
                <span>8:30 AM - 9:45 AM</span>
                <span>5 slots daily</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab !== "ai-chat" && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700">
              {selectedMember ? (
                <>
                  Booking as <span className="font-semibold text-gray-900">{selectedMember.name}</span>
                </>
              ) : (
                <span className="text-gray-500">Choose member for booking</span>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700"
              onClick={toggleMemberEditor}
              data-testid="change-member-mobile"
            >
              {isMemberEditorOpen ? "Done" : selectedMember ? "Change" : "Choose"}
            </button>
          </div>
          {isMemberEditorOpen && (
            <div className="mt-3">
              <Select value={selectedMemberId} onValueChange={handleMemberChange}>
                <SelectTrigger
                  ref={memberTriggerRef}
                  className="h-10 text-sm"
                  data-testid="select-member-mobile"
                >
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
          )}
        </div>
      )}

      <nav className="flex overflow-x-auto border-t border-gray-100 px-4">
        <button
          className={`mr-6 min-h-[44px] shrink-0 border-b-2 px-0 text-sm font-medium ${
            activeTab === "recent-activity"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("recent-activity")}
          data-testid="tab-recent-activity-button-mobile"
        >
          Recent Activity
        </button>
        <button
          className={`mr-6 min-h-[44px] shrink-0 border-b-2 px-0 text-sm font-medium ${
            activeTab === "monthly-participation"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("monthly-participation")}
          data-testid="tab-monthly-participation-button-mobile"
        >
          Monthly Participation
        </button>
        <button
          className={`min-h-[44px] shrink-0 border-b-2 px-0 text-sm font-medium ${
            activeTab === "ai-chat"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("ai-chat")}
          data-testid="tab-ai-chat-button-mobile"
        >
          AI Chat
        </button>
      </nav>
    </section>
  );
}
