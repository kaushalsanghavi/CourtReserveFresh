import { Clock, Calendar } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="app-title">
            Our own Slot bookings for Badminton
          </h1>
          <span className="text-sm text-gray-500">Group Scheduler @ Sunny</span>
        </div>
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span data-testid="time-slot">8:30 AM - 9:45 AM</span>
          </span>
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span data-testid="available-slots">6 slots available daily</span>
          </span>
        </div>
      </div>
    </header>
  );
}
