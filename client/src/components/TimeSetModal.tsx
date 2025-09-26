import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { isValidTimeSlot } from "@shared/sunday-booking-utils";

interface TimeSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timeSlot: string) => void;
  date: string;
  memberName: string;
  currentTimeSlot: string | null;
  isLoading?: boolean;
}

export default function TimeSetModal({
  isOpen,
  onClose,
  onConfirm,
  date,
  memberName,
  currentTimeSlot,
  isLoading = false,
}: TimeSetModalProps) {
  const [timeSlot, setTimeSlot] = useState(currentTimeSlot || "");
  const [error, setError] = useState("");

  // Reset form when modal opens/closes or props change
  useEffect(() => {
    if (isOpen) {
      setTimeSlot(currentTimeSlot || "");
      setError("");
    }
  }, [isOpen, currentTimeSlot]);

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
      setError("Please use format like: 8:00 AM - 9:00 AM, 8 - 9 AM, or simply 8 - 9");
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

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Change Time for {formatDate(date)}
          </h3>
          <p className="text-sm text-gray-500">
            Changing time for: <span className="font-semibold text-gray-900">{memberName}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="time-slot-input" className="block text-sm font-medium text-gray-700 mb-1">
              New Time Slot
            </label>
            <input
              id="time-slot-input"
              type="text"
              value={timeSlot}
              onChange={handleTimeSlotChange}
              placeholder="e.g., 8:00 AM - 9:00 AM, 8 - 9 AM, or 8 - 9"
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
              This will update the time for all existing bookings on this date.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
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
              {isLoading ? "Updating..." : "Update Time"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}