import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity } from "@shared/schema";
import { Clock, UserCheck, UserX, Calendar } from "lucide-react";

interface BookingHistoryProps {
  date: string; // YYYY-MM-DD format
}

export default function BookingHistory({ date }: BookingHistoryProps) {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities", date],
    queryFn: () => fetch(`/api/activities/${date}`).then(res => res.json()),
  });

  // Get current bookings for this date to highlight active bookers
  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  const currentBookings = bookings.filter((booking) => booking.date === date);
  const currentBookerIds = new Set(currentBookings.map((booking) => booking.memberId));

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="booking-history-loading">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatTimestamp = (createdAt: Date) => {
    return format(new Date(createdAt), "h:mm:ss a");
  };

  const formatFullTimestamp = (createdAt: Date) => {
    return format(new Date(createdAt), "MMM d, yyyy 'at' h:mm:ss a");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="booking-history">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">
          Booking History for {format(new Date(date), "EEE, MMM d, yyyy")}
        </h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-6">
        Timeline of all booking actions for this date
      </p>

      {activities.length === 0 ? (
        <div className="text-center py-8" data-testid="no-booking-history">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No booking activity for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const isCurrentBooker = currentBookerIds.has(activity.memberId);
            const isBooking = activity.action.includes("booked");
            const isCancellation = activity.action.includes("cancelled");
            
            return (
              <div 
                key={activity.id} 
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                  isCurrentBooker 
                    ? 'bg-green-50 border-green-200 shadow-sm' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                data-testid={`booking-history-item-${activity.id}`}
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    isCurrentBooker 
                      ? 'bg-green-500 border-green-600' 
                      : isBooking 
                        ? 'bg-blue-500 border-blue-600' 
                        : 'bg-red-500 border-red-600'
                  }`} />
                  {index < activities.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isBooking ? (
                      <UserCheck className={`w-4 h-4 ${isCurrentBooker ? 'text-green-600' : 'text-blue-600'}`} />
                    ) : (
                      <UserX className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      isCurrentBooker ? 'text-green-900' : 'text-gray-900'
                    }`} data-testid={`history-member-${activity.id}`}>
                      {activity.memberName}
                    </span>
                    {isCurrentBooker && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Current Booking
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2" data-testid={`history-action-${activity.id}`}>
                    {activity.action}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`history-time-${activity.id}`}>
                        {formatTimestamp(activity.createdAt)}
                      </span>
                    </div>
                    <span data-testid={`history-device-${activity.id}`}>
                      {activity.deviceInfo}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1" data-testid={`history-full-timestamp-${activity.id}`}>
                    Full timestamp: {formatFullTimestamp(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}