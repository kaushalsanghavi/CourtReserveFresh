import { useState } from "react";
import Header from "@/components/Header";
import MobileBookingChrome from "@/components/MobileBookingChrome";
import TabNavigation from "@/components/TabNavigation";
import QuickBooking, { SelectedMemberProvider } from "@/components/QuickBooking";
import BookingCalendar from "@/components/BookingCalendar";
import RecentActivity from "@/components/RecentActivity";
import MonthlyParticipation from "@/components/MonthlyParticipation";
import AIChatPage from "@/pages/ai-chat";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"recent-activity" | "monthly-participation" | "ai-chat">("recent-activity");

  return (
    <SelectedMemberProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="hidden md:block">
          <Header />
        </div>
        
        <main className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-8">
          <MobileBookingChrome activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="hidden md:block">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          
          {activeTab !== "ai-chat" && (
            <div className="hidden md:block">
              <QuickBooking />
            </div>
          )}
          
          {activeTab === "recent-activity" && (
            <div data-testid="tab-recent-activity">
              <BookingCalendar />
              <RecentActivity />
            </div>
          )}
          {activeTab === "monthly-participation" && (
            <div data-testid="tab-monthly-participation">
              <MonthlyParticipation />
            </div>
          )}
          {activeTab === "ai-chat" && (
            <div data-testid="tab-ai-chat">
              <AIChatPage />
            </div>
          )}
        </main>
      </div>
    </SelectedMemberProvider>
  );
}
