import { useState } from "react";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import QuickBooking from "@/components/QuickBooking";
import BookingCalendar from "@/components/BookingCalendar";
import RecentActivity from "@/components/RecentActivity";
import MonthlyParticipation from "@/components/MonthlyParticipation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"recent-activity" | "monthly-participation">("recent-activity");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <QuickBooking />
        
        {activeTab === "recent-activity" ? (
          <div data-testid="tab-recent-activity">
            <BookingCalendar />
            <RecentActivity />
          </div>
        ) : (
          <div data-testid="tab-monthly-participation">
            <MonthlyParticipation />
          </div>
        )}
      </main>
    </div>
  );
}
