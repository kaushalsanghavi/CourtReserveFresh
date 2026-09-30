import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import type { Activity, FineEvent } from "@shared/schema";
import { CalendarIcon } from "@phosphor-icons/react/dist/csr/Calendar";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CurrencyInrIcon } from "@phosphor-icons/react/dist/csr/CurrencyInr";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { UserCheckIcon } from "@phosphor-icons/react/dist/csr/UserCheck";
import { UserMinusIcon } from "@phosphor-icons/react/dist/csr/UserMinus";
import ActivityMetadata from "@/components/ActivityMetadata";

interface BookingHistoryProps {
  date: string;
}

type TimelineItem =
  | { kind: "booking"; id: string; occurredAt: Date; activity: Activity }
  | { kind: "fine"; id: string; occurredAt: Date; event: FineEvent };

const fineReasonLabels = {
  late: "came late",
  "no-show": "no-show",
};

export default function BookingHistory({ date }: BookingHistoryProps) {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities", date],
    queryFn: () => fetch(`/api/activities/${date}`).then((res) => res.json()),
  });
  const { data: fineHistory = [], isLoading: fineHistoryLoading } = useQuery<FineEvent[]>({
    queryKey: ["/api/fines/history/date", date],
    queryFn: () => fetch(`/api/fines/history/${date}`).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch fine history");
      return res.json();
    }),
  });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/bookings"] });

  const currentBookings = bookings.filter((booking) => booking.date === date);
  const currentBookerIds = new Set(currentBookings.map((booking) => booking.memberId));
  const timeline: TimelineItem[] = [
    ...activities.map((activity): TimelineItem => ({
      kind: "booking",
      id: `booking-${activity.id}`,
      occurredAt: new Date(activity.createdAt),
      activity,
    })),
    ...fineHistory.map((event): TimelineItem => ({
        kind: "fine",
        id: `fine-${event.id}`,
        occurredAt: new Date(event.createdAt),
        event,
      })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  if (isLoading || fineHistoryLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="booking-history-loading">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-16 rounded bg-gray-200" />
            <div className="h-16 rounded bg-gray-200" />
            <div className="h-16 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6" data-testid="booking-history">
      <div className="mb-2 flex items-start gap-2">
        <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" weight="bold" />
        <h3 className="text-lg font-medium leading-6 text-gray-900">History for {format(parseISO(date), "EEE, MMM d, yyyy")}</h3>
      </div>
      <p className="mb-6 text-sm text-gray-600">Timeline of booking and fine activity for this date</p>

      {timeline.length === 0 ? (
        <div className="py-8 text-center" data-testid="no-booking-history">
          <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" weight="duotone" />
          <p className="text-sm text-gray-400">No activity for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeline.map((item) => item.kind === "booking" ? (
            <BookingTimelineItem key={item.id} activity={item.activity} isCurrentBooker={currentBookerIds.has(item.activity.memberId)} />
          ) : (
            <FineTimelineItem key={item.id} event={item.event} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingTimelineItem({ activity, isCurrentBooker }: { activity: Activity; isCurrentBooker: boolean }) {
  const isBooking = activity.action.includes("booked");
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${isCurrentBooker ? "border-green-200 bg-green-50 shadow-sm" : "border-gray-200 bg-gray-50"}`} data-testid={`booking-history-item-${activity.id}`}>
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${isCurrentBooker ? "border-green-600 bg-green-500" : isBooking ? "border-blue-600 bg-blue-500" : "border-red-600 bg-red-500"}`} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {isBooking ? <UserCheckIcon className={`h-4 w-4 ${isCurrentBooker ? "text-green-600" : "text-blue-600"}`} weight="bold" /> : <UserMinusIcon className="h-4 w-4 text-red-600" weight="bold" />}
          <span className={`font-medium ${isCurrentBooker ? "text-green-900" : "text-gray-900"}`} data-testid={`history-member-${activity.id}`}>{activity.memberName}</span>
          {isCurrentBooker && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Current Booking</span>}
        </div>
        <p className="mb-2 text-sm text-gray-700" data-testid={`history-action-${activity.id}`}>{activity.action}</p>
        <ActivityMetadata occurredAt={activity.createdAt} deviceInfo={activity.deviceInfo} timeTestId={`history-time-${activity.id}`} deviceTestId={`history-device-${activity.id}`} fullTimestampTestId={`history-full-timestamp-${activity.id}`} />
      </div>
    </div>
  );
}

function FineTimelineItem({ event }: { event: FineEvent }) {
  const isReported = event.action === "reported";
  const isPaid = event.action === "paid";
  const colors = isReported ? "border-blue-200 bg-blue-50 text-blue-700" : isPaid ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700";
  const actionText = isReported
    ? `reported a ₹${event.amount} ${fineReasonLabels[event.reason]} fine for ${event.subjectMemberName}`
    : isPaid
      ? `marked ${event.subjectMemberName}'s ₹${event.amount} fine as paid`
      : `removed ${event.subjectMemberName}'s ₹${event.amount} fine`;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${colors}`} data-testid={`fine-history-item-${event.id}`}>
      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70">
        {isReported ? <CurrencyInrIcon className="h-3.5 w-3.5" weight="bold" /> : isPaid ? <CheckIcon className="h-3.5 w-3.5" weight="bold" /> : <TrashIcon className="h-3.5 w-3.5" weight="bold" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-medium">{event.actorName}</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">Party Fund</span>
        </div>
        <p className="text-sm text-gray-700">{actionText}</p>
        {event.note && <p className="mt-1 text-xs text-gray-500">{event.note}</p>}
        <ActivityMetadata className="mt-2" occurredAt={event.createdAt} deviceInfo={event.deviceInfo} deviceTestId={`fine-history-device-${event.id}`} />
      </div>
    </div>
  );
}
