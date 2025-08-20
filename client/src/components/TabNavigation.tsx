interface TabNavigationProps {
  activeTab: "recent-activity" | "monthly-participation";
  onTabChange: (tab: "recent-activity" | "monthly-participation") => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="mb-8">
      <nav className="flex space-x-8 border-b border-gray-200">
        <button 
          className={`px-1 py-4 text-sm font-medium border-b-2 ${
            activeTab === "recent-activity" 
              ? "text-green-600 border-green-600" 
              : "text-gray-500 hover:text-gray-700 border-transparent"
          }`}
          onClick={() => onTabChange("recent-activity")}
          data-testid="tab-recent-activity-button"
        >
          Recent Activity
        </button>
        <button 
          className={`px-1 py-4 text-sm font-medium border-b-2 ${
            activeTab === "monthly-participation" 
              ? "text-green-600 border-green-600" 
              : "text-gray-500 hover:text-gray-700 border-transparent"
          }`}
          onClick={() => onTabChange("monthly-participation")}
          data-testid="tab-monthly-participation-button"
        >
          Monthly Participation
        </button>
      </nav>
    </div>
  );
}
