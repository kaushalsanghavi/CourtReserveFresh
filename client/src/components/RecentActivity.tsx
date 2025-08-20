import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="recent-activity">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h2>
      <p className="text-sm text-gray-600 mb-6">Latest bookings and cancellations</p>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 italic" data-testid="no-activities">
            No activities yet
          </p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium" data-testid={`activity-member-${activity.id}`}>
                    {activity.memberName}
                  </span>
                  <span className="ml-1" data-testid={`activity-action-${activity.id}`}>
                    {activity.action}
                  </span>
                  <span className="font-medium ml-1" data-testid={`activity-date-${activity.id}`}>
                    {format(new Date(activity.date), "EEE, MMM d")}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1" data-testid={`activity-timestamp-${activity.id}`}>
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })} • from {activity.deviceInfo}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
