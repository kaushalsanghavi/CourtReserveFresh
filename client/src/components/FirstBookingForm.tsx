import { useState } from "react";
import { format } from "date-fns";
import { isValidTimeSlot } from "@shared/sunday-booking-utils";

interface FirstBookingFormProps {
  date: string;
  memberName: string;
  onConfirm: (timeSlot: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function FirstBookingForm({
  date,
  memberName,
  onConfirm,
  onCancel,
  isLoading = false,
}: FirstBookingFormProps) {
  const [timeSlot, setTimeSlot] = useState("");
  const [error, setError] = useState("");

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "EEE, MMM d");
  };

  // Validate time slot format
  const validateTimeSlot = (value: string): boolean => {
    if (!value.trim()) {
      setError("Time slot is required");
      return false;
    }

    if (!isValidTimeSlot(value)) {
      setError("Please use format: HH:MM AM/PM - HH:MM AM/PM (e.g., 8:00 AM - 9:00 AM)");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateTimeSlot(timeSlot)) {
      onConfirm(timeSlot.trim());
    }
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeSlot(value);
    
    // Clear error when user starts typing
    if (error && value.trim()) {
      setError("");
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Book for {formatDate(date)}
        </h3>
        <p className="text-sm text-gray-500">
          Booking for: <span className="font-semibold text-gray-900">{memberName}</span>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="first-booking-time-input" className="block text-sm font-medium text-gray-700 mb-1">
            Set Time Slot
          </label>
          <input
            id="first-booking-time-input"
            type="text"
            value={timeSlot}
            onChange={handleTimeSlotChange}
            placeholder="e.g., 8:00 AM - 9:00 AM"
            disabled={isLoading}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 ${
              error ? "border-red-300" : "border-gray-300"
            }`}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            You are the first to book, so you get to set the time for everyone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !timeSlot.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}