import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

// --- Session Collapse Types ---

interface SingleActivityItem {
  kind: "single";
  id: string;
  memberId: string;
  memberName: string;
  action: string;
  date: string;
  deviceInfo: string;
  createdAt: Date;
}

interface GroupedActivityItem {
  kind: "group";
  id: string;
  memberId: string;
  memberName: string;
  count: number;
  dates: string[]; // YYYY-MM-DD, sorted chronologically by booking date
  deviceInfo: string;
  createdAt: Date;
}

type ActivityItem = SingleActivityItem | GroupedActivityItem;

// --- Grouping Logic ---

const GROUPING_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Collapses consecutive bookings by the same member within a 30-minute
 * window into a single GroupedActivityItem. Cancellations are never grouped.
 * Input must be sorted newest-first (as returned by /api/activities).
 */
export function collapseActivitySessions(
  activities: Activity[],
  limit = 10,
): ActivityItem[] {
  const result: ActivityItem[] = [];
  let pendingGroup: Activity[] = [];

  const flushPending = () => {
    if (pendingGroup.length === 0) return;
    if (pendingGroup.length === 1) {
      const a = pendingGroup[0];
      result.push({
        kind: "single",
        id: a.id,
        memberId: a.memberId,
        memberName: a.memberName,
        action: a.action,
        date: a.date,
        deviceInfo: a.deviceInfo,
        createdAt: new Date(a.createdAt),
      });
    } else {
      // pendingGroup[0] is the newest (first encountered scanning newest-first)
      const newest = pendingGroup[0];
      const dates = Array.from(new Set(pendingGroup.map((a) => a.date))).sort();
      result.push({
        kind: "group",
        id: newest.id,
        memberId: newest.memberId,
        memberName: newest.memberName,
        count: pendingGroup.length,
        dates,
        deviceInfo: newest.deviceInfo,
        createdAt: new Date(newest.createdAt),
      });
    }
    pendingGroup = [];
  };

  for (const activity of activities) {
    if (result.length >= limit) break;

    const isBooking = activity.action.startsWith("booked");

    if (!isBooking) {
      flushPending();
      if (result.length < limit) {
        result.push({
          kind: "single",
          id: activity.id,
          memberId: activity.memberId,
          memberName: activity.memberName,
          action: activity.action,
          date: activity.date,
          deviceInfo: activity.deviceInfo,
          createdAt: new Date(activity.createdAt),
        });
      }
      continue;
    }

    if (pendingGroup.length === 0) {
      pendingGroup.push(activity);
      continue;
    }

    // lastInGroup is the oldest item currently in the group (we scan newest→oldest)
    const lastInGroup = pendingGroup[pendingGroup.length - 1];
    const sameMember = activity.memberId === lastInGroup.memberId;
    const withinWindow =
      new Date(lastInGroup.createdAt).getTime() -
        new Date(activity.createdAt).getTime() <=
      GROUPING_WINDOW_MS;

    if (sameMember && withinWindow) {
      pendingGroup.push(activity);
    } else {
      flushPending();
      if (result.length < limit) {
        pendingGroup.push(activity);
      }
    }
  }

  flushPending();
  return result.slice(0, limit);
}

// --- Date Range Formatting ---

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  if (dates.length === 1) {
    return format(new Date(dates[0]), "MMM d");
  }
  if (dates.length === 2) {
    return (
      format(new Date(dates[0]), "MMM d") +
      " & " +
      format(new Date(dates[1]), "MMM d")
    );
  }
  // 3+: show first–last with en-dash
  return (
    format(new Date(dates[0]), "MMM d") +
    "\u2013" +
    format(new Date(dates[dates.length - 1]), "MMM d")
  );
}

// --- Component ---

export default function RecentActivity() {
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const displayItems = collapseActivitySessions(activities, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="recent-activity">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h2>
      <p className="text-sm text-gray-600 mb-6">Latest 10 bookings and cancellations</p>

      <div className="max-h-80 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {displayItems.length === 0 ? (
          <p className="text-sm text-gray-400 italic" data-testid="no-activities">
            No activities yet
          </p>
        ) : (
          displayItems.map((item) => {
            if (item.kind === "single") {
              return (
                <div key={item.id} className="flex items-start space-x-3" data-testid={`activity-${item.id}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 ${item.action.startsWith("booked") ? "bg-green-500" : "bg-red-400"}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium" data-testid={`activity-member-${item.id}`}>
                        {item.memberName}
                      </span>
                      <span className="ml-1" data-testid={`activity-action-${item.id}`}>
                        {item.action}
                      </span>
                      <span className="font-medium ml-1" data-testid={`activity-date-${item.id}`}>
                        {format(new Date(item.date), "EEE, MMM d")}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1" data-testid={`activity-timestamp-${item.id}`}>
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })} • from {item.deviceInfo}
                    </p>
                  </div>
                </div>
              );
            }

            // kind === "group"
            return (
              <div key={item.id} className="flex items-start space-x-3" data-testid={`activity-${item.id}`}>
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.memberName}</span>
                    <span className="ml-1">booked {item.count} slots</span>
                    <span className="text-gray-500 ml-1">({formatDateRange(item.dates)})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })} • from {item.deviceInfo}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
