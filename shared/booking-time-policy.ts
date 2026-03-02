const IST_TIME_ZONE = "Asia/Kolkata";
const IST_LOCK_HOUR = 9;
const IST_LOCK_MINUTE = 30;

export const SAME_DAY_BOOKING_LOCK_MESSAGE =
  "Changes for today are closed after 9:30 AM IST";

function getIstNowParts(now: Date): {
  date: string;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
}

export function isSameDayLockedAfterCutoffInIst(
  bookingDate: string,
  now: Date = new Date(),
): boolean {
  const istNow = getIstNowParts(now);
  if (bookingDate !== istNow.date) {
    return false;
  }

  const currentMinuteOfDay = istNow.hour * 60 + istNow.minute;
  const cutoffMinuteOfDay = IST_LOCK_HOUR * 60 + IST_LOCK_MINUTE;

  return currentMinuteOfDay >= cutoffMinuteOfDay;
}
