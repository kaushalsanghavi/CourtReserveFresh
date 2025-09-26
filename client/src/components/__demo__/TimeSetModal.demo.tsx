import { useState } from "react";
import TimeSetModal from "../TimeSetModal";

export default function TimeSetModalDemo() {
  const [isEditTimeModalOpen, setIsEditTimeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = (timeSlot: string) => {
    console.log("Time slot confirmed:", timeSlot);
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsEditTimeModalOpen(false);
      alert(`Time slot updated to: ${timeSlot}`);
    }, 1500);
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsEditTimeModalOpen(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">TimeSetModal Component Demo</h1>
        <p className="text-gray-600 mb-8">Interactive preview of the time setting modal in different scenarios</p>
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Edit Time Scenario */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Edit Time Modal</h2>
            <p className="text-sm text-gray-600 mb-4">
              When a member wants to change an existing time slot for a Sunday booking, this modal appears.
            </p>
            <button
              onClick={() => setIsEditTimeModalOpen(true)}
              className="w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
            >
              Open "Edit Time" Modal
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Modal Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• <strong>Time Validation:</strong> Validates time slot format (HH:MM AM/PM - HH:MM AM/PM)</li>
            <li>• <strong>Edit Only:</strong> Modal is only used for editing existing time slots</li>
            <li>• <strong>Loading States:</strong> Shows loading indicators during API calls</li>
            <li>• <strong>Error Handling:</strong> Clear error messages for invalid input</li>
            <li>• <strong>Accessibility:</strong> Keyboard navigation, focus management, ARIA labels</li>
            <li>• <strong>Responsive:</strong> Adapts to different screen sizes</li>
            <li>• <strong>Escape Key:</strong> Press Escape to close (when not loading)</li>
            <li>• <strong>Click Outside:</strong> Click backdrop to close (when not loading)</li>
          </ul>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> First-time booking uses an inline form (not a modal) as shown in the SundayBookingCard demo.
            </p>
          </div>
        </div>

        {/* Edit Time Modal */}
        <TimeSetModal
          isOpen={isEditTimeModalOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          date="2025-01-19"
          memberName="John Smith"
          currentTimeSlot="8:00 AM - 9:00 AM"
          isFirstBooking={false}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}