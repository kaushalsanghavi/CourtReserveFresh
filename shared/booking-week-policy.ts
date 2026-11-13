const IST_TIME_ZONE = "Asia/Kolkata";
const WEEK_DONE_HOUR = 10;

// The playing week is over from Friday 10:00 AM IST, so the booking calendar
// should open on next week and leave the finished week behind "previous week".
// Returns how many days to move "today" forward to reach next Monday, or 0.
export function getDaysUntilOpenBookingWeek(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);

  if (weekday === "Fri" && hour >= WEEK_DONE_HOUR) return 3;
  if (weekday === "Sat") return 2;
  if (weekday === "Sun") return 1;
  return 0;
}
